# UTF-8 인코딩으로 Git 커밋하는 헬퍼 스크립트
param(
    [Parameter(Mandatory=$true)]
    [string]$Message
)

# UTF-8 인코딩 설정
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# 임시 파일에 커밋 메시지 저장 (UTF-8, BOM 없음)
$tempFile = [System.IO.Path]::GetTempFileName()
[System.IO.File]::WriteAllText($tempFile, $Message, [System.Text.UTF8Encoding]::new($false))

# 파일에서 커밋 메시지 읽어서 커밋
git commit -F $tempFile

# 임시 파일 삭제
Remove-Item $tempFile


