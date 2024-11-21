# 🍕 피자 예찬 SNS

피자를 사랑하는 사람들을 위한 소셜 네트워크 서비스입니다.

## 주요 기능

- 익명으로 게시글 작성
- 무한 스크롤 피드
- 좋아요 기능
- 댓글 기능
- 모바일 친화적 디자인

## 기술 스택

- Next.js 14
- TypeScript
- Tailwind CSS
- Firebase (Firestore)
- Vercel (배포)

## 시작하기

1. 저장소 클론
```bash
git clone https://github.com/eddy961206/pizzaria.git
cd pizzaria
```

2. next.js 의존성 설치
```bash
npm install
```

3. Firebase 설정
- Firebase Console에서 새 프로젝트 생성
- 웹 앱 추가
- `.env.local` 파일에 Firebase 설정 값 추가

4. 개발 서버 실행
```bash
npm run dev
```

5. 빌드
```bash
npm run build
```

6. Vercel 배포
```bash
vercel
```

## Firebase 설정

1. [Firebase Console](https://console.firebase.google.com/)에서 새 프로젝트 생성
2. 웹 앱 추가
3. Firebase 설정 값 추가
4. Firestore Database 생성:
    *  Firebase Console의 왼쪽 메뉴에서 "Firestore Database" 클릭
    *  "데이터베이스 만들기" 버튼 클릭
    *  "프로덕션 모드"로 시작 선택 (나중에 규칙을 수정할 예정)
    *  데이터베이스 위치 선택 (예: asia-northeast3 (서울))
    *  "사용 설정" 클릭하여 데이터베이스 생성
5. Firestore 규칙 설정:
Firestore Database 페이지에서 "규칙" 탭 클릭
다음 규칙을 입력하고 "게시" 버튼 클릭:

      ```javascript
      rules_version = '2';
      service cloud.firestore {
        match /databases/{database}/documents {
          // 게시글 컬렉션 규칙
          match /posts/{postId} {
            allow read: if true;  // 누구나 읽기 가능
            allow create: if request.resource.data.keys().hasAll(['content', 'nickname', 'createdAt', 'likes', 'comments'])
                        && request.resource.data.content is string
                        && request.resource.data.nickname is string
                        && request.resource.data.createdAt is number
                        && request.resource.data.likes == 0
                        && request.resource.data.comments == 0;
            allow update: if request.resource.data.diff(resource.data).affectedKeys()
                        .hasOnly(['likes', 'comments']);
          }
          
          // 댓글 컬렉션 규칙
          match /comments/{commentId} {
            allow read: if true;  // 누구나 읽기 가능
            allow create: if request.resource.data.keys().hasAll(['postId', 'content', 'nickname', 'createdAt'])
                        && request.resource.data.content is string
                        && request.resource.data.nickname is string
                        && request.resource.data.createdAt is number;
          }
        }
      }
      ```

6. Storage 규칙 설정(이미지 업로드를 위해) :
* 왼쪽 메뉴에서 "Storage" 클릭
* "시작하기" 클릭
* "프로덕션 모드"로 시작 선택
* 스토리지 위치 선택 (Firestore와 동일한 위치 권장)
* "규칙" 탭에서 다음 규칙 입력:

    ```javascript
    rules_version = '2';
    service firebase.storage {
      match /b/{bucket}/o {
        match /{allPaths=**} {
          // 5MB 이하의 이미지 파일만 업로드 허용
          allow read: if true;
          allow write: if request.resource.size < 5 * 1024 * 1024
                      && request.resource.contentType.matches('image/.*');
        }
      }
    }
    ```

이 규칙들은 다음과 같은 보안 기능을 제공합니다:

- 모든 사용자가 게시글과 댓글을 읽을 수 있습니다.
- 게시글 생성 시 필수 필드를 검증합니다.
- 게시글 수정은 좋아요와 댓글 수 업데이트만 허용합니다.
- 댓글 생성 시 필수 필드를 검증합니다.
- Storage에는 5MB 이하의 이미지 파일만 업로드할 수 있습니다.


## 라이선스

MIT

---

### 첫 프로젝트 세팅했을 때 방법

#### 1. Next.js 프로젝트 생성

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias @/*
```
#### 2. Firebase 추가 패키지 설치

```bash
npm install firebase @firebase/firestore react-infinite-scroll-component react-icons date-fns
```

#### 3. Firebase 설정 파일 생성

`src/lib/firebase.ts` 파일 생성 후 파일 내용 추가

#### 4. 환경 설정파일 생성

`/.env.local`

#### 5. 메인 페이지 생성

`src/app/page.tsx` 생성

#### 6. 컴포넌트들 생성

`src/components/*.tsx` 생성


#### 7. 댓글 관련 Firestore 복합 인덱스 설정

1. Firebase Console에서 Firestore Database의 Indexes 탭으로 이동

2. "Create Index" 버튼을 클릭하여 다음과 같이 복합 인덱스를 생성 :

| Collection ID | Fields to index | Index type |
|--------------|-----------------|------------|
| comments     | postId ↑        | Ascending  |
|              | createdAt ↓     | Descending |

- Query scope: Collection


