param([ValidateRange(1,25)][int]$MaxMinutes=15,[string]$Script='build-instanced.py')
$ErrorActionPreference='Stop'
if(Get-Process -Name UnrealEditor -ErrorAction SilentlyContinue){throw 'Existing editor preserved: no launch.'}
if((Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory / 1MB -lt 4){throw 'Less than4GiB free RAM: no launch.'}
$run=Join-Path $PSScriptRoot ('runs/'+(Get-Date -Format 'yyyyMMdd-HHmmss'))
New-Item -ItemType Directory -Force -Path $run | Out-Null
$env:WORLD_FIRST_OUTPUT=$run
$env:TEMP='D:/10-VENTURES/12-buena-onda/cinema-probe-cache/Temp'
$env:TMP=$env:TEMP
[Environment]::SetEnvironmentVariable('UE-LocalDataCachePath','D:/10-VENTURES/12-buena-onda/cinema-probe-cache/DDC','Process')
[Environment]::SetEnvironmentVariable('UE-SharedDataCachePath','None','Process')
$editor='D:/10-VENTURES/12-buena-onda/UE_5.8/Engine/Binaries/Win64/UnrealEditor.exe'
$args=@(('"'+(Join-Path $PSScriptRoot 'WorldFirst.uproject')+'"'),'/Engine/Maps/Entry','-dx11','-sm5','-NoSplash','-NoSound','-unattended','-windowed','-ResX=1280','-ResY=720','-NoVSync','-NoLiveCoding',('-abslog="'+(Join-Path $run 'UnrealEditor.log')+'"'),('-ExecCmds="py '+(Join-Path $PSScriptRoot $Script).Replace('\','/')+'"'))
$p=Start-Process -FilePath $editor -ArgumentList $args -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -PassThru
$ownedHandle=$p.Handle
@{pid=$p.Id;run=$run;started=(Get-Date).ToString('o');deadline=(Get-Date).AddMinutes($MaxMinutes).ToString('o');args=$args}|ConvertTo-Json|Set-Content (Join-Path $PSScriptRoot 'launch.json')
Write-Output "Owned editor $($p.Id) log $run"
if(-not $p.WaitForExit($MaxMinutes*60000)){Stop-Process -Id $p.Id;throw 'Owned editor time budget exceeded.'}
$p.Refresh()
Write-Output "Editor exit $($p.ExitCode)"
