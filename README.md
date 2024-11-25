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
`개발 시` 다음 규칙을 입력하고 "게시" 버튼 클릭:

      ```javascript
      rules_version = '2';
      service cloud.firestore {
        match /databases/{database}/documents {
          // posts 컬렉션 규칙
          match /posts/{postId} {
            allow read: if true;  // 누구나 읽기 가능
            allow create: if true;  // 누구나 생성 가능
            allow update: if true;  // 누구나 수정 가능 (IP 체크는 클라이언트에서)
            allow delete: if true;  // 누구나 삭제 가능 (IP 체크는 클라이언트에서)
          }
          
          // comments 컬렉션 규칙
          match /comments/{commentId} {
            allow read: if true;
            allow create: if true;
            allow update: if true;
            allow delete: if true;
          }
        }
      }
      ```

`실제 서비스 시` 규칙 :
  ```javascript
  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      // 기본 읽기 권한은 모두에게 허용
      match /{document=**} {
        allow read: if true;
      }
      
      // posts 컬렉션 규칙
      match /posts/{postId} {
        allow create: if request.auth != null 
          && request.resource.data.authorId == request.auth.uid;

        allow update: if request.auth != null && (
          // 작성자는 모든 필드 업데이트 가능
          resource.data.authorId == request.auth.uid
          ||
          // 다른 사용자들은 likes와 comments 필드만 증가 또는 감소 가능
          (
            // 업데이트하려는 필드가 정확히 1개인지 확인
            request.writeFields.size() == 1
            // 업데이트하려는 필드가 'likes' 또는 'comments' 중 하나인지 확인
            && (request.writeFields.hasOnly(['likes']) || request.writeFields.hasOnly(['comments']))
            // 해당 필드의 값이 1만큼 증가하거나 감소했는지 확인
            && (
              request.resource.data[request.writeFields[0]] == resource.data[request.writeFields[0]] + 1 ||
              request.resource.data[request.writeFields[0]] == resource.data[request.writeFields[0]] -1
            )
            // 다른 필드는 전혀 변경되지 않았는지 확인
            && request.resource.data.diff(resource.data).affectedKeys().hasOnly([request.writeFields[0]])
          )
        );

        allow delete: if request.auth != null 
          && resource.data.authorId == request.auth.uid;
      }

      
      // comments 컬렉션 규칙
      match /comments/{commentId} {
        allow create: if request.auth != null
          && request.resource.data.authorId == request.auth.uid;
        
        allow update, delete: if request.auth != null 
          && resource.data.authorId == request.auth.uid;
      }
      
      // likes 컬렉션 규칙
      match /likes/{likeId} {
        allow read: if request.auth != null;
        allow create, delete: if request.auth != null;
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
          allow update: if request.resource.size < 5 * 1024 * 1024
                      && request.resource.contentType.matches('image/.*');
          allow delete: if true;            
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

7. 익명 인증 설정

Firebase Console에서 Authentication 설정 :

1. Firebase Console 접속
2. 프로젝트 선택 
3. 왼쪽 메뉴에서 "Authentication" 선택
4. "Sign-in method" 탭 클릭
5. "Add new provider" 또는 "새 제공업체 추가" 클릭
6. "Anonymous" 또는 "익명" 선택
7. "Enable" 또는 "사용" 토글 버튼을 켜기
8. "Save" 또는 "저장" 클릭


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


