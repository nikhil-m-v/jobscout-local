import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { validateAssistance } from '../src/lib/assistance.ts';
import { candidateRelevance, relevanceStatus } from '../src/lib/relevance.ts';
import { filterCandidates, initialResultFilters } from '../src/lib/result-filters.ts';
import { candidateRequirements } from '../src/lib/work-requirements.ts';
const job = (title, snippet = '') => ({ title, snippet, url: 'https://jobs.example.com/1', source_index: null });
const mentions = title => ({ index: 0, roles: ['software-engineer'], regions: [], arrangements: [], seniorities: [], skills: [], shared_skills: [], content: { status: 'opening' }, shortlist: { roles: title ? [{ role: 'software-engineer', source: 'title', phrase: 'Software engineer' }] : [], exact_tools: [], exclusions: [] } });

test('explicit details preserve exact source evidence and multiple supported locations', () => {
  const candidate = job('Software engineer (Remote)', 'Location: India, Canada. Work mode: remote.');
  const evidence = candidateRelevance(candidate, mentions(true));
  for (const [field, value] of [['role', 'software-engineer'], ['region', 'india'], ['region', 'canada'], ['arrangement', 'remote']]) assert.equal(relevanceStatus(evidence[field], value), 'supported');
  for (const signals of Object.values(evidence)) for (const signal of signals) assert.ok(candidate[signal.source].includes(signal.phrase));
  assert.equal(relevanceStatus(evidence.region, 'australia'), 'contradiction');
});
test('incidental country, city, team and negated experience mentions remain unknown', () => {
  for (const snippet of ['Our clients are in India and Canada; join a remote team.', 'Location: Bengaluru.', 'Work mode: remote team support.', 'No remote experience required.', 'Headquartered in India. Remote collaboration tools.', 'Location: India team.']) {
    const evidence = candidateRelevance(job('Support for remote teams', snippet));
    assert.equal(relevanceStatus(evidence.region, 'india'), 'unknown', snippet);
    assert.equal(relevanceStatus(evidence.arrangement, 'remote'), 'unknown', snippet);
  }
});
test('explicit exclusions and conflicting text differ from missing details', () => {
  const negative = candidateRelevance(job('Software engineer', 'Not remote. Location: Canada.'));
  assert.equal(relevanceStatus(negative.arrangement, 'remote'), 'contradiction');
  assert.equal(relevanceStatus(negative.region, 'india'), 'contradiction');
  const mixed = candidateRelevance(job('Software engineer (Remote)', 'Not remote.'));
  assert.equal(relevanceStatus(mixed.arrangement, 'remote'), 'conflict');
  assert.equal(relevanceStatus(mixed.region, 'india'), 'unknown');
  const excludedRole = candidateRelevance(job('No Software engineer positions'), mentions(true));
  assert.equal(relevanceStatus(excludedRole.role, 'software-engineer'), 'contradiction');
  const roleConflict = candidateRelevance(job('Software engineer', 'No Software engineer positions.'), { ...mentions(true), shortlist: { ...mentions(true).shortlist, roles: [...mentions(true).shortlist.roles, { role: 'software-engineer', source: 'snippet', phrase: 'Software engineer' }] } });
  assert.equal(relevanceStatus(roleConflict.role, 'software-engineer'), 'conflict');
  const candidates = [job('No Software engineer positions'), job('Software engineer')];
  assert.deepEqual(filterCandidates(candidates, [mentions(true), mentions(true)], true, initialResultFilters, 'software-engineer').map(row => row.index), [1, 0]);
});
test('collections cannot supply individual opportunity evidence', () => {
  const candidate = job('Software engineer (Remote)', 'Location: Canada.');
  const evidence = candidateRelevance(candidate, { ...mentions(true), content: { status: 'collection' } });
  assert.ok(Object.values(evidence).every(signals => signals.length === 0));
});

test('ATS metadata supports explicit country/work mode without geocoding or worldwide eligibility', () => {
  for (const candidate of [job('Software engineer', 'Remote - India\n\nAbout the role'), job('Software engineer (Remote – India)'), job('Software engineer', 'This is a remote opportunity based in India.'), job('Software engineer (Remote)', 'locations: Example City, Example State, India.')]) {
    const evidence = candidateRelevance(candidate, mentions(true));
    assert.equal(relevanceStatus(evidence.region, 'india'), 'supported');
    assert.equal(relevanceStatus(evidence.arrangement, 'remote'), 'supported');
    for (const signals of Object.values(evidence)) for (const signal of signals) assert.ok(candidate[signal.source].includes(signal.phrase));
  }
  for (const snippet of ['Our remote teams serve India.', 'Client request: Remote - India support.', 'Remote-first culture across the world.', 'remote type: Partially Remote. locations: Example City.', 'locations: India team.']) {
    const evidence = candidateRelevance(job('Software engineer', snippet));
    assert.equal(relevanceStatus(evidence.region, 'india'), 'unknown', snippet);
    assert.equal(relevanceStatus(evidence.arrangement, 'remote'), 'unknown', snippet);
  }
});
test('explicit remote area restrictions contradict disjoint regions and preserve overlapping unknowns', () => {
  const latin = candidateRelevance(job('Software engineer - Remote, Latin America'));
  assert.equal(relevanceStatus(latin.region, 'india'), 'contradiction');
  assert.equal(relevanceStatus(latin.arrangement, 'remote'), 'supported');
  const emea = candidateRelevance(job('Software engineer (Remote – EMEA)'));
  assert.equal(relevanceStatus(emea.region, 'india'), 'contradiction');
  assert.equal(relevanceStatus(emea.region, 'europe'), 'unknown');
  assert.equal(relevanceStatus(emea.region, 'united-kingdom'), 'unknown');
  assert.equal(relevanceStatus(latin.region, 'united-states'), 'unknown');
  const mixed = candidateRelevance(job('Software engineer (Remote – EMEA)', 'Location: India.'));
  assert.equal(relevanceStatus(mixed.region, 'india'), 'conflict');
  const incidental = candidateRelevance(job('Software engineer', 'Our customers span Latin America and EMEA.'));
  assert.equal(relevanceStatus(incidental.region, 'india'), 'unknown');
  const jobs = [job('Software engineer - Remote, Latin America'), job('Software engineer (Remote – India)'), job('Software engineer')];
  const evidence = jobs.map((_, index) => ({ ...mentions(true), index }));
  assert.deepEqual(filterCandidates(jobs, evidence, false, { ...initialResultFilters, region: 'india', arrangement: 'remote' }).map(row => row.index), [1, 2]);
  assert.equal(filterCandidates(jobs, evidence, false, initialResultFilters).length, 3);
});
test('reversible filters keep unknowns/conflicts, reject title contradictions and preserve manual order', () => {
  const candidates = [job('Software engineer (Remote)', 'Location: India.'), job('Software engineer', 'Clients in Canada; remote team.'), job('Software engineer', 'Location: Canada. Work mode: onsite.'), job('Software engineer (Remote)', 'Not remote. Location: India.')];
  const evidence = candidates.map((_, index) => ({ ...mentions(true), index }));
  const filters = { ...initialResultFilters, role: 'software-engineer', region: 'india', arrangement: 'remote' };
  assert.deepEqual(filterCandidates(candidates, evidence, false, filters).map(row => row.index), [0, 1, 3]);
  assert.deepEqual(filterCandidates(candidates, evidence, false, { ...filters, keepUnknown: false }).map(row => row.index), [0]);
  assert.equal(filterCandidates(candidates, evidence, false, initialResultFilters).length, 4);
  const other = { ...mentions(true), shortlist: { ...mentions(true).shortlist, roles: [{ role: 'data-analyst', source: 'title', phrase: 'Data analyst' }, { role: 'software-engineer', source: 'snippet', phrase: 'software engineer' }] } };
  assert.equal(filterCandidates([job('Data analyst', 'Work with a software engineer.')], [other], false, { ...initialResultFilters, role: 'software-engineer' }).length, 0);
});

test('qualified ATS remote-area titles retain phrases, exclusions and conservative unknowns', () => {
  const positive = job('Software engineer (100% Remote - India)');
  const evidence = candidateRelevance(positive, mentions(true));
  assert.equal(relevanceStatus(evidence.region, 'india'), 'supported');
  assert.equal(relevanceStatus(evidence.arrangement, 'remote'), 'supported');
  for (const signals of Object.values(evidence)) for (const signal of signals) assert.ok(positive[signal.source].includes(signal.phrase));
  const restricted = candidateRelevance(job('Software engineer (100% Remote - EMEA)'));
  assert.equal(relevanceStatus(restricted.region, 'india'), 'contradiction');
  assert.equal(relevanceStatus(restricted.region, 'europe'), 'unknown');
  assert.equal(relevanceStatus(candidateRelevance(job('Software engineer (50% Remote - India)')).arrangement, 'remote'), 'unknown');
  for (const title of ['Software engineer (100% Remote - India team)', '100% Remote - India client support']) {
    const unknown = candidateRelevance(job(title));
    assert.equal(relevanceStatus(unknown.region, 'india'), 'unknown', title);
    assert.equal(relevanceStatus(unknown.arrangement, 'remote'), 'unknown', title);
  }
});

test('ATS India-at-employer suffix is metadata only within the application title format', () => {
  for (const title of ['Job Application for Software engineer - India at Example', 'Job Application for Software engineer II – Full Stack – India at Example']) {
    const candidate = job(title);
    const evidence = candidateRelevance(candidate, mentions(true));
    assert.equal(relevanceStatus(evidence.region, 'india'), 'supported');
    assert.ok(evidence.region.every(signal => candidate[signal.source].includes(signal.phrase)));
  }
  for (const title of ['Job Application for Software engineer at Example India', 'Job Application for Software engineer - India team at Example', 'Job Application for Software engineer - Not India at Example', 'Support India at our company']) {
    assert.equal(relevanceStatus(candidateRelevance(job(title)).region, 'india'), 'unknown', title);
  }
  const prose = candidateRelevance(job('Software engineer', 'Job Application for Software engineer - India at Example'));
  assert.equal(relevanceStatus(prose.region, 'india'), 'unknown');
  const collection = candidateRelevance(job('Job Application for Software engineer - India at Example'), { ...mentions(true), content: { status: 'collection' } });
  assert.ok(Object.values(collection).every(signals => signals.length === 0));
});

test('engine alias and frontend ATS evidence change strict filtering without losing conflicts or reset links', () => {
  const candidates = [
    job('Software Development Engineer (100% Remote - India)'),
    job('Job Application for Software Development Engineer II - Full Stack - India at Example', 'Fully remote.'),
    job('Software engineer (100% Remote - India)'),
    job('No Software Development Engineer positions', 'Location: India. Fully remote.'),
    job('Job Application for Software Development Engineer at Example India', 'Fully remote.'),
    job('Software Development Engineer (100% Remote - India)', 'Not remote.'),
  ];
  const root = fileURLToPath(new URL('../../../', import.meta.url));
  const python = resolve(root, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
  const review = 'Software Development Engineer Python SQL';
  const analyzed = spawnSync(python, ['-c', 'import json,sys; from jobscout_engine.domain.assistance import analyze_review; print(json.dumps(analyze_review(json.load(sys.stdin))))'], {
    cwd: root, input: JSON.stringify({ text: review, reviewed: true, candidates: candidates.map(({ title, snippet }) => ({ title, snippet })) }), encoding: 'utf8', timeout: 30000, windowsHide: true,
  });
  assert.equal(analyzed.status, 0, 'Synthetic offline engine analysis must finish');
  const evidence = validateAssistance(JSON.parse(analyzed.stdout), candidates.length, review, candidates).matches;
  const filters = { ...initialResultFilters, role: 'software-engineer', region: 'india', arrangement: 'remote' };
  assert.deepEqual(filterCandidates(candidates, evidence, false, filters).map(row => row.index), [0, 1, 2, 4, 5]);
  assert.deepEqual(filterCandidates(candidates, evidence, false, { ...filters, keepUnknown: false }).map(row => row.index), [0, 1, 2]);
  assert.equal(relevanceStatus(candidateRelevance(candidates[5], evidence[5]).arrangement, 'remote'), 'conflict');
  assert.deepEqual(filterCandidates(candidates, evidence, false, initialResultFilters).map(row => row.index), [0, 1, 2, 3, 4, 5]);
  for (const candidate of candidates) {
    const index = candidates.indexOf(candidate);
    for (const signals of Object.values(candidateRelevance(candidate, evidence[index]))) for (const signal of signals) assert.ok(candidate[signal.source].includes(signal.phrase));
  }
});

test('compact location metadata supports literal country and mode with exact source spans', () => {
  for (const [snippet, country, mode] of [
    ['India, Remote', 'india', 'remote'],
    ['India, Remote [...] India, Remote\nAbout this role', 'india', 'remote'],
    ['Job locations: India Example City Remote ... Python SQL.', 'india', 'remote'],
    ['Apply. locations: India Example City Remote ... Responsibilities.', 'india', 'remote'],
    ['Location: India (Remote)', 'india', 'remote'],
    ['Canada, Hybrid', 'canada', 'hybrid'],
    ['Location: Canada Sample City On-site.', 'canada', 'onsite'],
  ]) {
    const candidate = job('Software engineer', snippet);
    const evidence = candidateRelevance(candidate, mentions(true));
    assert.equal(relevanceStatus(evidence.region, country), 'supported', snippet);
    assert.equal(relevanceStatus(evidence.arrangement, mode), 'supported', snippet);
    for (const signals of Object.values(evidence)) for (const signal of signals) assert.ok(candidate[signal.source].includes(signal.phrase));
  }
});

test('compact metadata does not promote company prose, questions, partial modes or city-only text', () => {
  for (const snippet of [
    'Our customers are in India, Remote teams support them.',
    'India, Remote team support',
    'Is this India, Remote?',
    'Company locations: India Example City Remote.',
    'Our policy: India, Remote',
    'locations: India Supports Remote.',
    'locations: India Remote team.',
    'locations: India Example City Partially Remote.',
    'locations: India Example City 50% Remote.',
    'locations: Example City Remote.',
    'locations: India Example City Remote offices.',
    'locations: India Example City (Remote',
    'locations: India Example City Remote)',
    `locations: India ${'X'.repeat(150)} Remote.`,
  ]) {
    const evidence = candidateRelevance(job('Software engineer', snippet));
    assert.equal(relevanceStatus(evidence.region, 'india'), 'unknown', snippet);
    assert.equal(relevanceStatus(evidence.arrangement, 'remote'), 'unknown', snippet);
  }
});

test('compact metadata preserves exclusions, conflicts, requirement prompts and non-opening suppression', () => {
  const negative = candidateRelevance(job('Software engineer', 'Not India, Remote. Not remote.'));
  assert.equal(relevanceStatus(negative.region, 'india'), 'contradiction');
  assert.equal(relevanceStatus(negative.arrangement, 'remote'), 'contradiction');
  const candidate = job('Software engineer', 'India, Remote\nNot remote. Must physically reside in PST - EST timezones.');
  const evidence = candidateRelevance(candidate, mentions(true));
  assert.equal(relevanceStatus(evidence.region, 'india'), 'supported');
  assert.equal(relevanceStatus(evidence.arrangement, 'remote'), 'conflict');
  assert.ok(candidateRequirements(candidate).some(note => note.kind === 'location'));
  for (const status of ['collection', 'resource']) {
    assert.ok(Object.values(candidateRelevance(candidate, { ...mentions(true), content: { status } })).every(signals => signals.length === 0));
  }
});

test('production analysis and compact filters retain unknowns/conflicts and reject explicit mismatches', () => {
  const candidates = [
    job('Software engineer', 'India, Remote\nPython SQL.'),
    job('Software engineer', 'locations: India Example City Remote ... Python SQL.'),
    job('Software engineer', 'Location: Canada Sample City Remote. Python SQL.'),
    job('Software engineer', 'Location: India (Hybrid). Python SQL.'),
    job('Software engineer', 'Company locations: India Example City Remote. Python SQL.'),
    job('Software engineer', 'India, Remote\nNot remote. Python SQL.'),
  ];
  const root = fileURLToPath(new URL('../../../', import.meta.url));
  const review = 'Software engineer Python SQL';
  const analyzed = spawnSync(resolve(root, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python'), ['-c', 'import json,sys; from jobscout_engine.domain.assistance import analyze_review; print(json.dumps(analyze_review(json.load(sys.stdin))))'], {
    cwd: root, input: JSON.stringify({ text: review, reviewed: true, candidates: candidates.map(({ title, snippet }) => ({ title, snippet })) }), encoding: 'utf8', timeout: 30000, windowsHide: true,
  });
  assert.equal(analyzed.status, 0);
  const evidence = validateAssistance(JSON.parse(analyzed.stdout), candidates.length, review, candidates).matches;
  const filters = { ...initialResultFilters, role: 'software-engineer', region: 'india', arrangement: 'remote' };
  assert.deepEqual(filterCandidates(candidates, evidence, false, filters).map(row => row.index), [0, 1, 4, 5]);
  assert.deepEqual(filterCandidates(candidates, evidence, false, { ...filters, keepUnknown: false }).map(row => row.index), [0, 1]);
  assert.deepEqual(filterCandidates(candidates, evidence, false, initialResultFilters).map(row => row.index), [0, 1, 2, 3, 4, 5]);
});

const workdayJob = (snippet, url = 'https://synthetic.wd1.myworkdayjobs.com/en-US/Example/job/Software-Engineer_JR101') => ({ title: 'Software engineer', snippet, url, source_index: 3 });

test('leading repeated Workday metadata quotes literal country and remote mode', () => {
  for (const [snippet, country, phrase] of [
    ['Remote, India Remote, Python SQL.', 'india', 'Remote, India Remote'],
    ['Remote, Canada Remote', 'canada', 'Remote, Canada Remote'],
    ['  Remote, Australia Remote\r\nAbout this role.', 'australia', 'Remote, Australia Remote'],
    ['Remote, Canada Remote\nAbout this role.', 'canada', 'Remote, Canada Remote'],
  ]) {
    const candidate = workdayJob(snippet), evidence = candidateRelevance(candidate, mentions(true));
    assert.equal(relevanceStatus(evidence.region, country), 'supported', snippet);
    assert.equal(relevanceStatus(evidence.arrangement, 'remote'), 'supported', snippet);
    for (const field of ['region', 'arrangement']) assert.ok(evidence[field].some(signal => signal.phrase === phrase));
    for (const signals of Object.values(evidence)) for (const signal of signals) assert.ok(candidate[signal.source].includes(signal.phrase));
  }
});

test('repeated Workday metadata rejects prose, malformed prefixes, other hosts and non-posting paths', () => {
  const snippets = ['Our policy: Remote, Canada Remote', 'Company headquarters: Remote, Canada Remote',
    'Remote, Canada Remote team', 'Remote, Canada Partially Remote', 'Remote, Canada Remote?',
    'Remote, Canada Remote)', 'Remote, Montreal Remote', 'Remote, Canada 50% Remote',
    'Remote,CanadaRemote', '```\nRemote, Canada Remote\n```', 'Tasks.\nRemote, Canada Remote'];
  const candidates = [...snippets.map(snippet => workdayJob(snippet)),
    workdayJob('Remote, Canada Remote', 'https://jobs.example.com/1'),
    workdayJob('Remote, Canada Remote', 'https://synthetic.wd1.myworkdayjobs.com/en-US/Example'),
    workdayJob('Remote, Canada Remote', 'https://synthetic.wd1.myworkdayjobs.com/en-US/Example/job/unknown'),
    workdayJob('Remote, Canada Remote', 'https://jobs.lever.co/example/00000000-0000-4000-8000-000000000001')];
  for (const candidate of candidates) {
    const evidence = candidateRelevance(candidate);
    assert.equal(relevanceStatus(evidence.region, 'canada'), 'unknown', candidate.snippet);
    assert.equal(relevanceStatus(evidence.arrangement, 'remote'), 'unknown', candidate.snippet);
  }
  for (const status of ['collection', 'resource']) assert.ok(Object.values(candidateRelevance(workdayJob('Remote, Canada Remote'), { ...mentions(true), content: { status } })).every(signals => signals.length === 0));
});

test('repeated metadata preserves negatives and cannot replace an incompatible explicit mode', () => {
  assert.equal(relevanceStatus(candidateRelevance(workdayJob('Remote, Canada Remote, Not remote.')).arrangement, 'remote'), 'conflict');
  assert.equal(relevanceStatus(candidateRelevance(workdayJob('Remote, Canada Remote, Not Canada.')).region, 'canada'), 'conflict');
  const incompatible = candidateRelevance(workdayJob('Remote, Canada Remote, Work mode: onsite.'));
  assert.equal(relevanceStatus(incompatible.region, 'canada'), 'supported');
  assert.equal(relevanceStatus(incompatible.arrangement, 'remote'), 'contradiction');
});

test('production analysis and repeated metadata filters retain unknowns, conflicts and reset order', () => {
  const candidates = [workdayJob('Remote, India Remote, Python SQL.'), workdayJob('Python SQL.'),
    workdayJob('Remote, Canada Remote, Python SQL.'), workdayJob('Remote, India Remote, Not remote. Python SQL.'),
    workdayJob('Remote, India Remote, Work mode: onsite. Python SQL.'),
    workdayJob('Remote, India Remote, Python SQL.', 'https://jobs.example.com/1'),
    workdayJob('Remote, India Remote, Python SQL.', 'https://synthetic.wd1.myworkdayjobs.com/en-US/Example')];
  const root = fileURLToPath(new URL('../../../', import.meta.url)), review = 'Software engineer Python SQL';
  const analyzed = spawnSync(resolve(root, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python'), ['-c', 'import json,sys; from jobscout_engine.domain.assistance import analyze_review; print(json.dumps(analyze_review(json.load(sys.stdin))))'], {
    cwd: root, input: JSON.stringify({ text: review, reviewed: true, candidates: candidates.map(({ title, snippet }) => ({ title, snippet })) }), encoding: 'utf8', timeout: 30000, windowsHide: true,
  });
  assert.equal(analyzed.status, 0);
  const evidence = validateAssistance(JSON.parse(analyzed.stdout), candidates.length, review, candidates).matches;
  const filters = { ...initialResultFilters, role: 'software-engineer', region: 'india', arrangement: 'remote', showCollections: false };
  for (const rank of [false, true]) assert.deepEqual(filterCandidates(candidates, evidence, rank, filters, 'software-engineer').map(row => row.index), [0, 1, 3, 5]);
  assert.deepEqual(filterCandidates(candidates, evidence, false, { ...filters, keepUnknown: false }).map(row => row.index), [0]);
  assert.deepEqual(filterCandidates(candidates, evidence, false, initialResultFilters).map(row => row.index), [0, 1, 2, 3, 4, 5, 6]);
});

const headingJob = (snippet, title = 'Job Posting | Example Employer', url = 'https://job-boards.greenhouse.io/synthetic/jobs/101') => ({ title, snippet, url, source_index: 0 });
const heading = (country = 'Canada', role = 'Data analyst') => `# ${role}\n\n## Example Employer · Sample City, Example Province, ${country}`;

test('structured posting headings quote canonical role, literal country and standalone work-mode tags', () => {
  for (const [country, region, tag, mode] of [['Canada', 'canada', 'HYBRID', 'hybrid'], ['India', 'india', 'REMOTE', 'remote'], ['Australia', 'australia', 'ONSITE', 'onsite']]) {
    const candidate = headingJob(`#LI-${tag} #LI-EX1 [...] Other text.\n${heading(country)}`);
    const evidence = candidateRelevance(candidate);
    assert.equal(relevanceStatus(evidence.role, 'data-analyst'), 'supported');
    assert.equal(relevanceStatus(evidence.region, region), 'supported');
    assert.equal(relevanceStatus(evidence.arrangement, mode), 'supported');
    assert.ok(evidence.role.some(signal => signal.phrase === '# Data analyst'));
    assert.ok(evidence.region.some(signal => signal.phrase === `## Example Employer · Sample City, Example Province, ${country}`));
    assert.ok(evidence.arrangement.some(signal => signal.phrase === `#LI-${tag}`));
    for (const signals of Object.values(evidence)) for (const signal of signals) assert.ok(candidate[signal.source].includes(signal.phrase));
  }
  const crlf = candidateRelevance(headingJob('# Data analyst\r\n## Example Employer · Sample City, Canada\r\n#LI-HYBRID', 'Job Posting'));
  assert.equal(relevanceStatus(crlf.role, 'data-analyst'), 'supported');
  assert.equal(relevanceStatus(crlf.region, 'canada'), 'supported');
  assert.equal(relevanceStatus(crlf.arrangement, 'hybrid'), 'supported');
});

test('structured headings reject ambiguous pages, locations, code samples and unrelated tags', () => {
  for (const candidate of [
    headingJob(`${heading()}\n#LI-HYBRID`, 'Careers'),
    headingJob(`${heading()}\n#LI-HYBRID`, undefined, 'https://job-boards.greenhouse.io/synthetic'),
    headingJob(`${heading()}\n#LI-HYBRID`, undefined, 'https://jobs.example.com/unknown'),
    headingJob(`${heading()}\n# Data engineer\n#LI-HYBRID`),
    headingJob(`${heading()}\n${heading()}\n#LI-HYBRID`),
    headingJob('# Data analyst\n## Example Employer · Sample City\n#LI-HYBRID'),
    headingJob(heading('Canada?') + '\n#LI-HYBRID'),
    headingJob(heading('Canada Offices') + '\n#LI-HYBRID'),
    headingJob('# Data analyst\n## Example Employer · Our Customers, Canada\n#LI-HYBRID'),
    headingJob('# Data analyst\n## Example Employer · Company Headquarters, Canada\n#LI-HYBRID'),
    headingJob('# Data analyst\n## Example Employer · ' + 'X'.repeat(170) + ', Canada\n#LI-HYBRID'),
    headingJob('```\n' + heading() + '\n#LI-HYBRID\n```'),
    headingJob('# Data analyst\nResponsibilities\n## Example Employer · Sample City, Canada\n#LI-HYBRID'),
    headingJob('# Data analyst jobs\n## Example Employer · Sample City, Canada\n#LI-HYBRID'),
  ]) {
    const evidence = candidateRelevance(candidate);
    assert.equal(relevanceStatus(evidence.role, 'data-analyst'), 'unknown', candidate.snippet);
    assert.equal(relevanceStatus(evidence.region, 'canada'), 'unknown', candidate.snippet);
    assert.equal(relevanceStatus(evidence.arrangement, 'hybrid'), 'unknown', candidate.snippet);
  }
  for (const text of ['Our company offers hybrid benefits.', 'Hybrid testing methods.', 'Not #LI-HYBRID', '#LI-HYBRID-PARTIAL', '#LI-HYBRID team', '#LI-HYBRID\n#LI-REMOTE']) {
    const evidence = candidateRelevance(headingJob(`${heading()}\n${text}`));
    assert.equal(relevanceStatus(evidence.arrangement, 'hybrid'), 'unknown', text);
  }
});

test('structured heading evidence preserves explicit exclusions and non-opening suppression', () => {
  const candidate = headingJob(`${heading()}\n#LI-HYBRID\nNot hybrid.`);
  assert.equal(relevanceStatus(candidateRelevance(candidate).arrangement, 'hybrid'), 'conflict');
  assert.equal(relevanceStatus(candidateRelevance(headingJob(`${heading()}\n#LI-HYBRID\nNot Canada.`)).region, 'canada'), 'conflict');
  const competingMode = candidateRelevance(headingJob(`${heading()}\n#LI-HYBRID\nWork mode: remote.`));
  assert.equal(relevanceStatus(competingMode.arrangement, 'hybrid'), 'contradiction', 'An incompatible explicit work-mode detail must not be overwritten by a tag');
  for (const status of ['collection', 'resource']) assert.ok(Object.values(candidateRelevance(candidate, { ...mentions(false), content: { status } })).every(signals => signals.length === 0));
  for (const title of ['Software engineer (Development & Testing)', 'Software engineer (Automation Testing, C# and .NET)']) {
    const evidence = candidateRelevance(headingJob('Responsible for testing.\n' + heading('India', 'Quality engineer') + '\n#LI-REMOTE', title), mentions(true));
    assert.equal(relevanceStatus(evidence.role, 'quality-engineer'), 'contradiction');
  }
});

test('production analysis gives structured analyst metadata existing role priority and strict retention', () => {
  const candidates = [headingJob('Data analytics SQL.\n' + heading() + '\n#LI-HYBRID'),
    { ...job('Data analyst', 'Data analytics SQL.'), url: 'https://job-boards.greenhouse.io/synthetic/jobs/102' },
    headingJob('Data analytics SQL.\n' + heading('India') + '\n#LI-HYBRID')];
  const review = 'Data analyst SQL data analytics';
  const root = fileURLToPath(new URL('../../../', import.meta.url));
  const analyzed = spawnSync(resolve(root, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python'), ['-c', 'import json,sys; from jobscout_engine.domain.assistance import analyze_review; print(json.dumps(analyze_review(json.load(sys.stdin))))'], { cwd: root, input: JSON.stringify({ text: review, reviewed: true, candidates: candidates.map(({ title, snippet }) => ({ title, snippet })) }), encoding: 'utf8', timeout: 30000, windowsHide: true });
  assert.equal(analyzed.status, 0);
  const evidence = validateAssistance(JSON.parse(analyzed.stdout), candidates.length, review, candidates).matches;
  const filters = { ...initialResultFilters, role: 'data-analyst', region: 'canada', arrangement: 'hybrid' };
  assert.deepEqual(filterCandidates(candidates, evidence, true, filters, 'data-analyst').map(row => row.index), [0, 1]);
  assert.deepEqual(filterCandidates(candidates, evidence, true, { ...filters, keepUnknown: false }, 'data-analyst').map(row => row.index), [0]);
  assert.deepEqual(filterCandidates(candidates, evidence, false, initialResultFilters).map(row => row.index), [0, 1, 2]);
});
