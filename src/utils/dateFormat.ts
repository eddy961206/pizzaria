import { format, isToday, isThisYear } from 'date-fns';
import { ko } from 'date-fns/locale';

export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  
  if (isToday(date)) {
    // 오늘이면 시간만 표시 (오전/오후 h:mm)
    return format(date, 'a h:mm', { locale: ko });
  } else if (isThisYear(date)) {
    // 올해면 월, 일, 시간 표시 (M월 d일 오전/오후 h:mm)
    return format(date, 'M월 d일 a h:mm', { locale: ko });
  } else {
    // 다른 연도면 전체 표시 (yyyy년 M월 d일 오전/오후 h:mm)
    console.log(timestamp);
    console.log(date);
    return format(date, 'yyyy년 M월 d일 a h:mm', { locale: ko });
  }
} 