# Git 커밋 헬퍼 스크립트 (UTF-8 인코딩 보장)
param(
    [Parameter(Mandatory=$true)]
    [string]$Message
)

# UTF-8 인코딩 설정
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$env:PYTHONIOENCODING = 'utf-8'

# Git 커밋 실행
git commit -m $Message





