# Git 한글 커밋 메시지 깨짐 문제 해결 방법

## 문제 원인
Windows cmd.exe가 기본적으로 EUC-KR(코드 페이지 949)을 사용하여 한글 커밋 메시지가 깨집니다.

## 해결 방법

### 방법 1: PowerShell 사용 (권장)
PowerShell은 기본적으로 UTF-8을 사용하므로 한글이 정상적으로 표시됩니다.

### 방법 2: Git Bash 사용
Git Bash를 사용하면 한글 커밋 메시지가 정상적으로 표시됩니다.

### 방법 3: VS Code Git 기능 사용
VS Code의 소스 제어 패널에서 커밋 메시지를 작성하면 한글이 정상적으로 저장됩니다.

### 방법 4: 커밋 메시지를 영어로 작성
가장 간단한 방법은 커밋 메시지를 영어로 작성하는 것입니다.

## 현재 설정 확인
```bash
git config --global i18n.commitencoding
git config --global i18n.logoutputencoding
```

## 참고
- 이미 커밋된 메시지는 수정할 수 없습니다.
- 앞으로의 커밋에 대해서만 적용됩니다.
- GitHub 웹사이트에서도 깨져 보이면 이미 잘못된 인코딩으로 저장된 것입니다.


