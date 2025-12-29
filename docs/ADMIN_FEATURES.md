# 관리자 페이지 기능 가이드

## 새로운 기능 (2025년 업데이트)

### 1. 유료/무료 회원 명단 관리

#### 기능 개요
- 관리자 대시보드에서 유료회원과 무료회원을 분리하여 관리
- 각 회원 그룹별 상세 정보 확인 가능

#### 사용 방법

1. **관리자 페이지 접속**
   - URL: `https://yourdomain.com/admin`
   - 관리자 계정으로 로그인 필요

2. **유료회원 명단 보기**
   - 대시보드에서 "유료회원 수" 카드 클릭
   - 또는 상단 탭에서 직접 이동
   - 표시 정보:
     - 이메일
     - 구독 플랜
     - 월 결제 금액
     - 가입일
     - 구독 만료일
     - 메시지 보내기 버튼

3. **무료회원 명단 보기**
   - 대시보드에서 "무료회원 수" 카드 클릭
   - 또는 상단 탭에서 직접 이동
   - 표시 정보:
     - 이메일
     - 가입일
     - 메시지 보내기 버튼

### 2. 개별 회원 메시지 보내기

#### 기능 개요
- 유료회원 또는 무료회원에게 개별 메시지 전송
- 프로모션, 공지사항, 개인화된 메시지 전달

#### 사용 방법

1. **메시지 보내기**
   - 유료회원 또는 무료회원 명단에서 "메시지" 버튼 클릭
   - 팝업 창에서 메시지 내용 입력
   - "전송" 버튼 클릭

2. **현재 상태**
   - ⚠️ **개발 모드**: 현재는 실제로 메시지가 전송되지 않습니다
   - 콘솔에 로그만 출력됩니다
   - 실제 구현을 위해서는 이메일 API 연동 필요

#### 실제 메시지 전송 구현 방법

##### 옵션 1: SendGrid 사용

1. **SendGrid 계정 생성**
   ```bash
   npm install @sendgrid/mail
   ```

2. **API 키 설정**
   ```env
   SENDGRID_API_KEY=your_api_key_here
   ```

3. **코드 수정** (`app/admin/page.tsx`)
   ```typescript
   const handleSendMessage = async () => {
     const response = await fetch('/api/admin/send-message', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
         to: selectedUser.email,
         message: messageContent
       })
     });
     // ...
   };
   ```

4. **API 엔드포인트 생성** (`app/api/admin/send-message/route.ts`)
   ```typescript
   import sgMail from '@sendgrid/mail';
   
   sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
   
   export async function POST(request: Request) {
     const { to, message } = await request.json();
     
     await sgMail.send({
       to,
       from: 'noreply@yourdomain.com',
       subject: '관리자 메시지',
       text: message,
       html: `<p>${message}</p>`
     });
     
     return Response.json({ success: true });
   }
   ```

##### 옵션 2: AWS SES 사용

1. **AWS SES 설정**
   ```bash
   npm install @aws-sdk/client-ses
   ```

2. **환경 변수**
   ```env
   AWS_REGION=ap-northeast-2
   AWS_ACCESS_KEY_ID=your_key
   AWS_SECRET_ACCESS_KEY=your_secret
   ```

3. **구현 코드**
   ```typescript
   import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
   
   const ses = new SESClient({ region: process.env.AWS_REGION });
   
   await ses.send(new SendEmailCommand({
     Source: 'noreply@yourdomain.com',
     Destination: { ToAddresses: [to] },
     Message: {
       Subject: { Data: '관리자 메시지' },
       Body: { Text: { Data: message } }
     }
   }));
   ```

##### 옵션 3: Resend 사용 (추천)

1. **Resend 설치**
   ```bash
   npm install resend
   ```

2. **환경 변수**
   ```env
   RESEND_API_KEY=re_xxxxx
   ```

3. **구현 (간단함)**
   ```typescript
   import { Resend } from 'resend';
   
   const resend = new Resend(process.env.RESEND_API_KEY);
   
   await resend.emails.send({
     from: 'noreply@yourdomain.com',
     to: selectedUser.email,
     subject: '관리자 메시지',
     text: messageContent
   });
   ```

### 3. 회원 통계 대시보드

#### 표시 정보
- **총 회원**: 전체 가입자 수
- **유료회원 수**: 활성 구독이 있는 회원 (클릭 가능)
- **무료회원 수**: 구독이 없는 회원 (클릭 가능)
- **총 매출**: 모든 활성 구독의 월 매출 합계

#### 기능
- 각 카드 클릭 시 상세 명단으로 이동
- 실시간 데이터 업데이트
- 명단에서 "돌아가기" 버튼으로 대시보드 복귀

## 데이터베이스 구조

### profiles 테이블
```sql
- id: UUID (Primary Key)
- email: TEXT
- created_at: TIMESTAMP
```

### subscriptions 테이블
```sql
- id: UUID (Primary Key)
- user_id: UUID (Foreign Key → profiles.id)
- plan_id: UUID (Foreign Key → plans.id)
- status: TEXT ('active', 'cancelled', etc.)
- created_at: TIMESTAMP
- current_period_end: TIMESTAMP
```

### plans 테이블
```sql
- id: UUID (Primary Key)
- name: TEXT
- price: INTEGER
- tier: TEXT
- features: TEXT[]
```

## API 엔드포인트

### GET /api/admin/data

관리자 대시보드 데이터를 가져옵니다.

**응답 예시:**
```json
{
  "totalUsers": 150,
  "paidMembers": 25,
  "freeMembers": 125,
  "totalRevenue": 500000,
  "paidMembersList": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "created_at": "2025-01-01T00:00:00Z",
      "subscription": {
        "plan_name": "프리미엄",
        "plan_price": 20000,
        "current_period_end": "2025-02-01T00:00:00Z"
      }
    }
  ],
  "freeMembersList": [
    {
      "id": "uuid",
      "email": "free@example.com",
      "created_at": "2025-01-15T00:00:00Z"
    }
  ]
}
```

## 보안 고려사항

### 관리자 인증
- 현재: 하드코딩된 이메일 목록 (`ADMIN_EMAILS`)
- 권장: 데이터베이스 기반 역할 관리 시스템

### 개선 방안
```sql
-- profiles 테이블에 role 컬럼 추가
ALTER TABLE profiles ADD COLUMN role TEXT DEFAULT 'user';

-- 관리자 설정
UPDATE profiles SET role = 'admin' WHERE email = 'admin@example.com';
```

```typescript
// 코드에서 확인
const { data: profile } = await supabase
  .from('profiles')
  .select('role')
  .eq('id', user.id)
  .single();

if (profile?.role !== 'admin') {
  // 접근 거부
}
```

## 사용 시나리오

### 시나리오 1: 유료회원 프로모션
1. "유료회원 수" 카드 클릭
2. 프로모션 대상 회원 확인
3. "메시지" 버튼으로 개별 안내
4. 특별 할인 코드 전송

### 시나리오 2: 무료회원 전환 유도
1. "무료회원 수" 카드 클릭
2. 가입 후 일정 기간 경과한 회원 확인
3. 유료 플랜 혜택 안내 메시지 전송
4. 전환율 추적

### 시나리오 3: 구독 만료 예정 알림
1. "유료회원 명단" 확인
2. 만료일이 임박한 회원 필터링
3. 갱신 안내 메시지 전송
4. 이탈 방지

## 향후 개선 계획

### 단기 (1-2주)
- [ ] 이메일 API 연동 (SendGrid/Resend)
- [ ] 메시지 템플릿 기능
- [ ] 대량 메시지 발송 기능

### 중기 (1개월)
- [ ] 회원 필터링 (가입일, 구독 상태 등)
- [ ] 메시지 발송 이력 저장
- [ ] 회원 검색 기능

### 장기 (3개월)
- [ ] 자동화된 메시지 캠페인
- [ ] A/B 테스트 기능
- [ ] 회원 세그먼트 관리
- [ ] 분석 대시보드 (전환율, 이탈률 등)

## 문제 해결

### 명단이 표시되지 않는 경우
1. 브라우저 콘솔 확인 (F12)
2. API 응답 확인: `/api/admin/data`
3. Supabase 데이터베이스 연결 확인
4. RLS 정책 확인 (Service Role Key 사용 중)

### 메시지 전송이 안 되는 경우
- 현재는 정상입니다 (개발 모드)
- 실제 구현 시 이메일 API 연동 필요
- 위의 "실제 메시지 전송 구현 방법" 참고

## 관련 문서

- [포트원 실제 결제 테스트](./PORTONE_REAL_PAYMENT_TEST.md)
- [Supabase 대시보드 가이드](./SUPABASE_DASHBOARD_GUIDE.md)
- [프로젝트 컨텍스트](../PROJECT_CONTEXT.md)
