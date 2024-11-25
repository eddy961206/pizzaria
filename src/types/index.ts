// 게시글 타입 정의
export interface Post {
  id: string;
  content: string;
  imageUrl?: string;
  createdAt: number;
  nickname: string;
  likes: number;
  comments: number;
  authorId: string;
}

// 댓글 타입 정의
export interface Comment {
  id: string;
  postId: string;
  content: string;
  nickname: string;
  createdAt: number;
  authorId: string;
}

// 좋아요 타입 정의
export interface Like {
  id: string;
  postId: string;
  userId: string;
  createdAt: number;
}
