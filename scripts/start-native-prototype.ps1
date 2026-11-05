param([switch]$Render,[switch]$Review,[switch]$GenerateClientConfig)
$ErrorActionPreference='Stop'
$project='D:\10-VENTURES\12-buena-onda\cruise-publish-20261006\.vercel\cinema-probe\CinemaProbe.uproject'
$editor='D:\10-VENTURES\12-buena-onda\UE_5.8\Engine\Binaries\Win64\UnrealEditor.exe'
if(Get-Process UnrealEditor -ErrorAction SilentlyContinue){throw 'An editor is already running; preserved. Inspect it instead.'}
$memory=Get-CimInstance Win32_OperatingSystem
if($Render -and $memory.FreePhysicalMemory -lt 4*1MB){throw 'Rendered launch needs at least 4 GiB free RAM; existing project previously exhausted paging memory.'}
if($Render -and $memory.FreeVirtualMemory -lt 8*1MB){throw 'Rendered launch needs at least 8 GiB system commit headroom. The last restart fell to 94 MB; free authoring resources before trying again. No other applications or paging settings were changed.'}
$root=Split-Path $project
$run=Join-Path $root ('runs/prototype-'+(Get-Date -Format 'yyyyMMdd-HHmmss'))
New-Item -ItemType Directory -Path $run -Force | Out-Null
$env:TEMP='D:\10-VENTURES\12-buena-onda\cinema-probe-cache\Temp'
$env:TMP=$env:TEMP
[Environment]::SetEnvironmentVariable('UE-LocalDataCachePath','D:\10-VENTURES\12-buena-onda\cinema-probe-cache\DDC','Process')
$map=if($Review){'/Game/BuenaOndaPrototype20261020/Lvl_WaterfrontReview'}else{'/Engine/Maps/Entry'}
$arguments=@(('"'+$project+'"'),$map,'-NoSplash','-NoSound','-unattended','-NoLiveCoding','-PixelStreamingEditorAutoStreamPIE=false','-ModelContextProtocolStartServer','-ModelContextProtocolPort=8000',('-abslog="'+(Join-Path $run 'UnrealEditor.log')+'"'))
if($Render){$arguments+=@('-dx11','-sm5','-windowed','-ResX=1280','-ResY=720')}else{$arguments+='-nullrhi'}
if($GenerateClientConfig){$arguments+='-ExecCmds="ModelContextProtocol.GenerateClientConfig Codex"'}
$process=Start-Process -FilePath $editor -ArgumentList $arguments -WorkingDirectory $root -WindowStyle Hidden -PassThru
@{pid=$process.Id;project=$project;rendered=[bool]$Render;run=$run;endpoint='http://127.0.0.1:8000/mcp';at=(Get-Date).ToString('o')} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $run 'launch.json') -Encoding UTF8
Write-Output ('Owned editor '+$process.Id+' log '+(Join-Path $run 'UnrealEditor.log'))
