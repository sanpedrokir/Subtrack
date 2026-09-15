@echo off
REM Wrapper for Windows Task Scheduler. Runs the daily expiring-subscription
REM email check and appends output to logs\check-expiring.log.
cd /d "%~dp0.."
if not exist logs mkdir logs
call npx tsx scripts\check-expiring.ts >> logs\check-expiring.log 2>&1
