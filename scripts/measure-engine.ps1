param([int]$Runs = 3, [ValidateSet('docx', 'pdf', 'shortlist')][string]$Format = 'docx', [string]$EnginePath)
$ErrorActionPreference = 'Stop'
if ($Runs -lt 1 -or $Runs -gt 10) { throw 'Runs must be between 1 and 10.' }
$root = Split-Path $PSScriptRoot -Parent
$engine = if ($EnginePath) { [IO.Path]::GetFullPath($EnginePath) } else { Join-Path $root 'apps/desktop/src-tauri/target/release/jobscout-engine.exe' }
if (!(Test-Path -LiteralPath $engine)) { throw 'Run npm run desktop:build first.' }
$engineIdentity = [pscustomobject]@{ sha256 = (Get-FileHash -LiteralPath $engine -Algorithm SHA256).Hash.ToLowerInvariant(); bytes = (Get-Item -LiteralPath $engine).Length }
$measuredAt = [DateTime]::UtcNow.ToString('o')
$hardware = [pscustomobject]@{
    os = [Runtime.InteropServices.RuntimeInformation]::OSDescription
    process_architecture = [Runtime.InteropServices.RuntimeInformation]::ProcessArchitecture.ToString()
    logical_processors = [Environment]::ProcessorCount
    physical_memory_bytes = (Get-CimInstance Win32_ComputerSystem -Property TotalPhysicalMemory).TotalPhysicalMemory
}
function Assert-EngineUnchanged {
    if ((Get-Item -LiteralPath $engine).Length -ne $engineIdentity.bytes -or (Get-FileHash -LiteralPath $engine -Algorithm SHA256).Hash.ToLowerInvariant() -ne $engineIdentity.sha256) { throw 'Engine changed during measurement; no report will be emitted.' }
}
function Hash-Bytes([byte[]]$bytes) {
    return [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($bytes)).ToLowerInvariant()
}
Add-Type -AssemblyName System.Net.Http
function Get-Bytes($directory) {
    $sum = (Get-ChildItem -LiteralPath $directory -File -Recurse -ErrorAction Stop | Measure-Object Length -Sum).Sum
    if ($null -eq $sum) { return 0 }; return [long]$sum
}
$results = @()
for ($run = 1; $run -le $Runs; $run++) {
    Assert-EngineUnchanged
    $runResult = $null; $started = $false; $known = @{}
    $directory = Join-Path $root ('.local/resource-check/' + [guid]::NewGuid().ToString('N'))
    $temp = Join-Path $directory 'temp'
    New-Item -ItemType Directory -Path $temp -Force | Out-Null
    $start = [System.Diagnostics.ProcessStartInfo]::new($engine)
    $start.UseShellExecute = $false
    $start.CreateNoWindow = $true
    $start.RedirectStandardOutput = $true
    $start.RedirectStandardError = $true
    $start.Arguments = '--data-dir "' + $directory + '" --port 0'
    $start.EnvironmentVariables['JOBSCOUT_SESSION_TOKEN'] = [guid]::NewGuid().ToString('N')
    $start.EnvironmentVariables['TEMP'] = $temp
    $start.EnvironmentVariables['TMP'] = $temp
    $process = [System.Diagnostics.Process]::new()
    $process.StartInfo = $start
    $client = [System.Net.Http.HttpClient]::new([System.Net.Http.HttpClientHandler]@{ UseProxy = $false })
    $client.Timeout = [timespan]::FromSeconds(5)
    $client.DefaultRequestHeaders.Authorization = [System.Net.Http.Headers.AuthenticationHeaderValue]::new('Bearer', $start.EnvironmentVariables['JOBSCOUT_SESSION_TOKEN'])
    $timer = [System.Diagnostics.Stopwatch]::StartNew()
    try {
        $process.Start() | Out-Null
        $started = $true
        $line = $process.StandardOutput.ReadLineAsync()
        while (!$line.IsCompleted -and $timer.Elapsed.TotalSeconds -lt 30) { Start-Sleep -Milliseconds 50 }
        if (!$line.IsCompleted -or $process.HasExited) { throw 'Packaged engine startup failed or timed out.' }
        $binding = $line.Result | ConvertFrom-Json
        if ($binding.event -ne 'bound') { throw 'Missing engine bound handshake.' }
        $port = $binding.port
        if (!$port -or $port -lt 1 -or $port -gt 65535) { throw 'Invalid engine handshake.' }
        $url = "http://127.0.0.1:$port/api/v1"
        $response = $client.GetAsync("$url/health").GetAwaiter().GetResult()
        $response.EnsureSuccessStatusCode() | Out-Null
        $health = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult() | ConvertFrom-Json
        if ($health.status -ne 'ready' -or $health.database -ne 'ready') { throw 'Packaged workspace did not report ready.' }
        $response.Dispose()
        $ready = [math]::Round($timer.Elapsed.TotalSeconds, 2)
        Start-Sleep -Seconds 2
        function Get-TreeMemory {
            if ($process.HasExited) { throw 'Measured engine exited during sampling.' }
            $all = @(Get-CimInstance Win32_Process -Property ProcessId,ParentProcessId,CreationDate)
            $ids = @($process.Id)
            do {
                $next = @($all | Where-Object { $_.ParentProcessId -in $ids -and $_.ProcessId -notin $ids } | ForEach-Object { [int]$_.ProcessId })
                $ids += $next
            } while ($next.Count)
            $working = 0L; $private = 0L
            foreach ($id in $ids) {
                $p = Get-Process -Id $id -ErrorAction SilentlyContinue
                $record = $all | Where-Object { $_.ProcessId -eq $id } | Select-Object -First 1
                # CIM timestamps have microsecond precision; Process timestamps
                # may retain a final 100ns digit. Compare the common precision.
                $ticks = if ($p) { $p.StartTime.ToUniversalTime().Ticks } else { 0L }
                if ($p -and $record -and ($ticks - ($ticks % 10)) -eq $record.CreationDate.ToUniversalTime().Ticks) {
                    $working += $p.WorkingSet64; $private += $p.PrivateMemorySize64
                    $known[$id] = $p.StartTime.ToUniversalTime().Ticks
                }
            }
            if ($working -le 0 -or $private -le 0) { throw 'Engine memory could not be sampled with verified process identities.' }
            return @{ working = $working; private = $private }
        }
        $idle = Get-TreeMemory
        $extracted = Get-Bytes $temp
        if ($Format -eq 'shortlist') {
            $fixture = Get-Content -LiteralPath (Join-Path $root 'evaluation/shortlist-cases.json') -Raw | ConvertFrom-Json
            $case = $fixture.cases | Where-Object { $_.id -eq 'bounded-50' }
            if (!$case -or $case.candidates.Count -ne 50) { throw 'Missing bounded synthetic shortlist fixture.' }
            $review = @{ text = $case.review; reviewed = $true; candidates = @($case.candidates | ForEach-Object { @{ title = $_.title; snippet = $_.snippet } }) } | ConvertTo-Json -Depth 8 -Compress
            $fixtureHash = Hash-Bytes ([Text.Encoding]::UTF8.GetBytes($review))
            $content = [System.Net.Http.StringContent]::new($review, [System.Text.Encoding]::UTF8, 'application/json')
            $content.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::new('application/json')
            $peak = $idle.working; $peakPrivate = $idle.private
            $analysis = $client.PostAsync("$url/assistance", $content)
            $sampleCount = 0
            while (!$analysis.IsCompleted) {
                $sample = Get-TreeMemory
                $sampleCount++
                $peak = [math]::Max($peak, $sample.working)
                $peakPrivate = [math]::Max($peakPrivate, $sample.private)
                Start-Sleep -Milliseconds 100
            }
            $analysisResponse = $analysis.GetAwaiter().GetResult()
            $analysisResponse.EnsureSuccessStatusCode() | Out-Null
            $body = $analysisResponse.Content.ReadAsStringAsync().GetAwaiter().GetResult() | ConvertFrom-Json
            if ($body.matches.Count -ne 50) { throw 'Synthetic shortlist analysis was incomplete.' }
            $analysisResponse.Dispose(); $content.Dispose()
            $latencies = @()
            for ($sampleRun = 0; $sampleRun -lt 5; $sampleRun++) {
                $content = [System.Net.Http.StringContent]::new($review, [System.Text.Encoding]::UTF8, 'application/json')
                $content.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::new('application/json')
                $requestTimer = [System.Diagnostics.Stopwatch]::StartNew()
                $response = $client.PostAsync("$url/assistance", $content).GetAwaiter().GetResult()
                $response.EnsureSuccessStatusCode() | Out-Null
                $body = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult() | ConvertFrom-Json
                $requestTimer.Stop()
                if ($body.matches.Count -ne 50) { throw 'Synthetic shortlist analysis was incomplete.' }
                $latencies += [math]::Round($requestTimer.Elapsed.TotalMilliseconds, 2)
                $response.Dispose(); $content.Dispose()
            }
            $runResult = [pscustomobject]@{ run = $run; format = $Format; fixture_sha256 = $fixtureHash; candidates = 50; ready_seconds = $ready; idle_working_bytes = $idle.working; idle_private_bytes = $idle.private; workload_memory_samples = $sampleCount; sampled_analysis_working_bytes = $peak; sampled_analysis_private_bytes = $peakPrivate; warm_analysis_request_ms = $latencies; extracted_temp_bytes = $extracted; data_bytes = (Get-Bytes $directory) - (Get-Bytes $temp) }
            $results += $runResult
            continue
        }
        # Generate synthetic documents; no user file is accepted by this benchmark.
        Add-Type -AssemblyName System.IO.Compression
        $stream = [System.IO.MemoryStream]::new()
        $zip = [System.IO.Compression.ZipArchive]::new($stream, [System.IO.Compression.ZipArchiveMode]::Create, $true)
        $types = [System.IO.StreamWriter]::new($zip.CreateEntry('[Content_Types].xml').Open())
        $types.Write('<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>')
        $types.Dispose()
        $entry = $zip.CreateEntry('word/document.xml')
        $writer = [System.IO.StreamWriter]::new($entry.Open())
        $writer.Write('<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' + ('<w:p><w:r><w:t>Synthetic engineer profile. Python SQL accessible software.</w:t></w:r></w:p>' * 1000) + '</w:body></w:document>')
        $writer.Dispose(); $zip.Dispose()
        $reserved = $client.PostAsync("$url/imports", [System.Net.Http.StringContent]::new('')).GetAwaiter().GetResult()
        $reserved.EnsureSuccessStatusCode() | Out-Null
        $taskId = ($reserved.Content.ReadAsStringAsync().GetAwaiter().GetResult() | ConvertFrom-Json).id
        $reserved.Dispose()
        $content = [System.Net.Http.ByteArrayContent]::new($stream.ToArray())
        $stream.Dispose()
        $mime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        if ($Format -eq 'pdf') {
            $content.Dispose()
            # ASCII-only PDF at the supported 10-page limit, 40 lines per page.
            $objects = [System.Collections.Generic.List[string]]::new()
            $objects.Add('<< /Type /Catalog /Pages 2 0 R >>')
            $kids = (0..9 | ForEach-Object { "$(4 + 2 * $_) 0 R" }) -join ' '
            $objects.Add("<< /Type /Pages /Kids [$kids] /Count 10 >>")
            $objects.Add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
            foreach ($page in 0..9) {
                $streamId = 5 + 2 * $page
                $objects.Add("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents $streamId 0 R >>")
                $drawing = "BT /F1 10 Tf 50 740 Td 14 TL`n" + ((1..40 | ForEach-Object { '(Synthetic engineer profile. Python SQL accessible software.) Tj T*' }) -join "`n") + "`nET`n"
                $objects.Add("<< /Length $($drawing.Length) >>`nstream`n${drawing}endstream")
            }
            $pdf = [System.Text.StringBuilder]::new("%PDF-1.4`n")
            $offsets = [System.Collections.Generic.List[int]]::new()
            for ($i = 0; $i -lt $objects.Count; $i++) {
                $offsets.Add($pdf.Length)
                $pdf.Append("$($i + 1) 0 obj`n$($objects[$i])`nendobj`n") | Out-Null
            }
            $xref = $pdf.Length
            $pdf.Append("xref`n0 $($objects.Count + 1)`n0000000000 65535 f `n") | Out-Null
            foreach ($offset in $offsets) { $pdf.Append($offset.ToString('D10') + " 00000 n `n") | Out-Null }
            $pdf.Append("trailer`n<< /Size $($objects.Count + 1) /Root 1 0 R >>`nstartxref`n$xref`n%%EOF`n") | Out-Null
            $content = [System.Net.Http.ByteArrayContent]::new([System.Text.Encoding]::ASCII.GetBytes($pdf.ToString()))
            $mime = 'application/pdf'
        }
        $content.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::new($mime)
        $fixtureHash = Hash-Bytes ($content.ReadAsByteArrayAsync().GetAwaiter().GetResult())
        $import = $client.PutAsync("$url/imports/$taskId/$Format", $content)
        $peak = $idle.working; $peakPrivate = $idle.private
        $sampleCount = 0
        while (!$import.IsCompleted) {
            $sample = Get-TreeMemory
            $sampleCount++
            $peak = [math]::Max($peak, $sample.working)
            $peakPrivate = [math]::Max($peakPrivate, $sample.private)
            Start-Sleep -Milliseconds 100
        }
        $importResponse = $import.GetAwaiter().GetResult()
        $importResponse.EnsureSuccessStatusCode() | Out-Null
        $body = $importResponse.Content.ReadAsStringAsync().GetAwaiter().GetResult() | ConvertFrom-Json
        if (!$body.text -or !$body.text.Contains('Synthetic engineer profile. Python SQL accessible software.')) { throw 'Synthetic import did not return the generated fixture text.' }
        $importResponse.Dispose(); $content.Dispose()
        $runResult = [pscustomobject]@{ run = $run; format = $Format; fixture_sha256 = $fixtureHash; ready_seconds = $ready; idle_working_bytes = $idle.working; idle_private_bytes = $idle.private; workload_memory_samples = $sampleCount; sampled_import_working_bytes = $peak; sampled_import_private_bytes = $peakPrivate; extracted_temp_bytes = $extracted; data_bytes = (Get-Bytes $directory) - (Get-Bytes $temp) }
        $results += $runResult
    } finally {
        $client.Dispose()
        if ($started -and !$process.HasExited) { $process.Kill($true); if (!$process.WaitForExit(10000)) { throw 'Benchmark engine did not terminate.' } }
        $cleanupDeadline = [DateTime]::UtcNow.AddSeconds(10)
        do {
            $remaining = @($known.GetEnumerator() | Where-Object {
                $member = Get-Process -Id $_.Key -ErrorAction SilentlyContinue
                $member -and $member.StartTime.ToUniversalTime().Ticks -eq $_.Value
            })
            if ($remaining.Count) { Start-Sleep -Milliseconds 100 }
        } while ($remaining.Count -and [DateTime]::UtcNow -lt $cleanupDeadline)
        if ($remaining.Count) { throw 'A sampled benchmark process survived cleanup; no report will be emitted.' }
        if ($runResult) { $runResult | Add-Member -NotePropertyName remaining_sampled_owned_processes -NotePropertyValue 0 }
        $process.Dispose()
        # Keep isolated benchmark files for inspection; never delete existing app data.
    }
}
Assert-EngineUnchanged
[pscustomobject]@{
    schema_version = 1
    measured_at_utc = $measuredAt
    engine = $engineIdentity
    hardware = $hardware
    scope = 'Fresh synthetic workspaces; warm filesystem cache; engine tree only. Health includes the existing optional local-runtime loopback status probe; no inference, provider, vault, page or download operation. Summed working sets may count shared pages repeatedly. CIM enumeration plus 100ms pauses can miss brief workload peaks. Extraction/data sizes are pre-cleanup snapshots; isolated synthetic workspace files are retained. Cleanup forcibly stops only the benchmark tree; this is not normal shutdown acceptance. No desktop, installed footprint, online search, Results rendering, reboot-cold startup or hardware requirement is established.'
    runs = $results
} | ConvertTo-Json -Depth 6
