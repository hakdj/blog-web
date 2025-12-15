@echo off
chcp 65001 >nul 2>&1
set PYTHONIOENCODING=utf-8
REM 커밋 메시지를 임시 파일에 UTF-8로 저장
echo %~1 > commit_msg_temp.txt
REM UTF-8 BOM 없이 저장 (PowerShell 사용)
powershell -Command "[System.IO.File]::WriteAllText('commit_msg_temp.txt', '%~1', [System.Text.Encoding]::UTF8)"
REM 파일에서 커밋 메시지 읽어서 커밋
git commit -F commit_msg_temp.txt
REM 임시 파일 삭제
del commit_msg_temp.txt

