/**
 * Slugify function for Vietnamese-friendly URLs
 * Converts text to URL-safe slug by:
 * - Removing Vietnamese diacritics
 * - Converting đ/Đ to d/D
 * - Removing special characters
 * - Replacing spaces with dashes
 */
export function slugify(str: string): string {
  let result = String(str).trim().toLowerCase();
  result = result.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // Bỏ dấu tiếng Việt
  result = result.replace(/đ/g, 'd').replace(/Đ/g, 'D'); // Thay thế riêng chữ đ
  result = result.replace(/([^0-9a-z-\s])/g, ''); // Xóa các ký tự đặc biệt
  result = result.replace(/(\s+)/g, '-'); // Thay khoảng trắng bằng dấu gạch ngang
  result = result.replace(/-+/g, '-'); // Xóa các dấu gạch ngang liền kề
  result = result.replace(/^-+|-+$/g, ''); // Xóa gạch ngang ở đầu và cuối
  return result;
}
