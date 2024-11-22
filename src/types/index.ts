// 게시글 타입 정의
export interface Post {
  id: string;
  content: string;
  imageUrl?: string;
  createdAt: number;
  nickname: string;
  likes: number;
  comments: number;
  authorIp: string;
  authorId: string;
}

// 댓글 타입 정의
export interface Comment {
  id: string;
  postId: string;
  content: string;
  nickname: string;
  createdAt: number;
  authorIp: string;
  authorId: string;
}
