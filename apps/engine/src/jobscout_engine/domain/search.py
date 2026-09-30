"""Authoritative public criteria boundary. No profile, storage or network imports."""
from dataclasses import dataclass
from types import MappingProxyType

ROLES = MappingProxyType({
    "software-engineer": "Software engineer", "data-analyst": "Data analyst",
    "data-engineer": "Data engineer", "product-manager": "Product manager",
    "product-designer": "Product designer", "quality-engineer": "Quality engineer",
    "it-support": "IT support", "project-manager": "Project manager",
})
REGIONS = MappingProxyType({"any": "", "india": "India", "united-states": "United States",
    "united-kingdom": "United Kingdom", "canada": "Canada", "australia": "Australia", "europe": "Europe"})
SENIORITIES = MappingProxyType({"any": "", "internship": "Internship", "entry": "Entry level",
    "mid": "Mid level", "senior": "Senior", "lead": "Lead"})
ARRANGEMENTS = MappingProxyType({"any": "", "remote": "Remote", "hybrid": "Hybrid", "onsite": "On-site"})
SKILLS = MappingProxyType({"python": "Python", "javascript": "JavaScript", "typescript": "TypeScript",
    "sql": "SQL", "java": "Java", "dotnet": ".NET", "react": "React", "cloud": "Cloud platforms",
    "analytics": "Data analytics", "design": "Product design", "testing": "Software testing",
    "project-management": "Project management"})
MAX_PUBLIC_SKILLS = 5
MAX_CRITERIA_BYTES = 4096
QUERY_VERSION = 1


class InvalidSearchCriteria(ValueError):
    def __init__(self):
        super().__init__("Choose only supported public search categories.")


@dataclass(frozen=True)
class PublicSearchCriteria:
    role: str
    region: str
    seniority: str
    arrangement: str
    skills: tuple[str, ...]


def validate_public_search_criteria(value: object) -> PublicSearchCriteria:
    if type(value) is not dict or set(value) != {"role", "region", "seniority", "arrangement", "skills"}:
        raise InvalidSearchCriteria()
    for key, catalog in (("role", ROLES), ("region", REGIONS),
                         ("seniority", SENIORITIES), ("arrangement", ARRANGEMENTS)):
        if type(value[key]) is not str or value[key] not in catalog:
            raise InvalidSearchCriteria()
    skills = value["skills"]
    if (type(skills) is not list or len(skills) > MAX_PUBLIC_SKILLS
        or any(type(skill) is not str or skill not in SKILLS for skill in skills)
        or len(set(skills)) != len(skills)):
        raise InvalidSearchCriteria()
    return PublicSearchCriteria(value["role"], value["region"], value["seniority"],
                                value["arrangement"], tuple(sorted(skills)))


def construct_public_query(value: object) -> str:
    # Always revalidate: a dataclass/type annotation alone is not a trust boundary.
    criteria = validate_public_search_criteria(value)
    terms = [ROLES[criteria.role], "jobs"]
    terms.extend(term for term in (REGIONS[criteria.region], SENIORITIES[criteria.seniority],
                                  ARRANGEMENTS[criteria.arrangement]) if term)
    terms.extend(SKILLS[skill] for skill in criteria.skills)
    return " ".join(terms)


def reject_duplicate_keys(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise InvalidSearchCriteria()
        result[key] = value
    return result
