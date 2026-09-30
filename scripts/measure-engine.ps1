param([int]$Runs = 3)
$ErrorActionPreference = 'Stop'
if ($Runs -lt 1 -or $Runs -gt 10) { throw 'Runs must be between 1 and 10.' }
$root = Split-Path $PSScriptRoot -Parent
$engine = Join-Path $root 'apps/desktop/src-tauri/target/release/jobscout-engine.exe'
if (!(Test-Path -LiteralPath $engine)) { throw 'Run npm run desktop:build first.' }
Add-Type -AssemblyName System.Net.Http
function Get-Bytes($directory) {
    $sum = (Get-ChildItem -LiteralPath $directory -File -Recurse -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum
    if ($null -eq $sum) { return 0 }; return [long]$sum
}
$results = @()
for ($run = 1; $run -le $Runs; $run++) {
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
        $line = $process.StandardOutput.ReadLineAsync()
        while (!$line.IsCompleted -and $timer.Elapsed.TotalSeconds -lt 30) { Start-Sleep -Milliseconds 50 }
        if (!$line.IsCompleted -or $process.HasExited) { throw 'Packaged engine startup failed or timed out.' }
        $port = ($line.Result | ConvertFrom-Json).port
        if (!$port -or $port -lt 1 -or $port -gt 65535) { throw 'Invalid engine handshake.' }
        $url = "http://127.0.0.1:$port/api/v1"
        $response = $client.GetAsync("$url/health").GetAwaiter().GetResult()
        $response.EnsureSuccessStatusCode() | Out-Null
        $response.Dispose()
        $ready = [math]::Round($timer.Elapsed.TotalSeconds, 2)
        Start-Sleep -Seconds 2
        function Get-TreeMemory {
            $all = @(Get-CimInstance Win32_Process -Property ProcessId,ParentProcessId)
            $ids = @($process.Id)
            do {
                $next = @($all | Where-Object { $_.ParentProcessId -in $ids -and $_.ProcessId -notin $ids } | ForEach-Object { [int]$_.ProcessId })
                $ids += $next
            } while ($next.Count)
            $working = 0L; $private = 0L
            foreach ($id in $ids) {
                $p = Get-Process -Id $id -ErrorAction SilentlyContinue
                if ($p) { $working += $p.WorkingSet64; $private += $p.PrivateMemorySize64 }
            }
            return @{ working = $working; private = $private }
        }
        $idle = Get-TreeMemory
        $extracted = Get-Bytes $temp
        # Generate a synthetic DOCX; no user file is accepted by this benchmark.
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
        $content.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::new('application/vnd.openxmlformats-officedocument.wordprocessingml.document')
        $import = $client.PutAsync("$url/imports/$taskId/docx", $content)
        $peak = $idle.working; $peakPrivate = $idle.private
        while (!$import.IsCompleted) {
            $sample = Get-TreeMemory
            $peak = [math]::Max($peak, $sample.working)
            $peakPrivate = [math]::Max($peakPrivate, $sample.private)
            Start-Sleep -Milliseconds 100
        }
        $importResponse = $import.GetAwaiter().GetResult()
        $importResponse.EnsureSuccessStatusCode() | Out-Null
        $body = $importResponse.Content.ReadAsStringAsync().GetAwaiter().GetResult() | ConvertFrom-Json
        if (!$body.text) { throw 'Synthetic import did not return extracted text.' }
        $importResponse.Dispose(); $content.Dispose()
        $results += [pscustomobject]@{ run = $run; ready_seconds = $ready; idle_working_bytes = $idle.working; idle_private_bytes = $idle.private; sampled_import_working_bytes = $peak; sampled_import_private_bytes = $peakPrivate; extracted_temp_bytes = $extracted; data_bytes = (Get-Bytes $directory) - (Get-Bytes $temp) }
    } finally {
        $client.Dispose()
        if (!$process.HasExited) { $process.Kill($true); $process.WaitForExit() }
        $process.Dispose()
        # Keep isolated benchmark files for inspection; never delete existing app data.
    }
}
$results | ConvertTo-Json
