import { checkFileSize } from './upload';

export function checkFileTypeByAccept(file, accept) {
  if (!accept || accept === '*') {
    return true;
  }
  const valid = accept.replace(/\s/g, '').split(',').filter(accept => {
    if (accept.startsWith('.')) {
      return (file.name || '').toLowerCase().endsWith(accept.toLowerCase());
    }
    return new RegExp(accept.replace('*', '.*')).test(file.type);
  }).length > 0;
  return valid;
}

/**
 * 处理粘贴事件获取文件
 * @param {ClipboardEvent} event 粘贴事件对象
 * @param {string} accept 接受的文件类型
 * @param {number} size 文件大小限制，单位M
 * @returns {Promise<File[]>} 文件数组
 */
export async function handlePasteFiles(event, accept, size) {
  try {
    const items = event.clipboardData ? event.clipboardData.items : null;
    if (!items) {
      return [];
    }

    const validItems = [];
    for (const item of items) {
      if (item.kind !== 'file') {
        continue;
      }
      const file = item.getAsFile();
      if (!file) {
        continue;
      }
      // 如果设置了大小限制，则跳过不符合条件的文件
      if (size > 0 && !checkFileSize(file, size)) {
        continue;
      }
      if (checkFileTypeByAccept(file, accept)) {
        validItems.push(file);
      }
    }
    return validItems;
  } catch (error) {
    console.error('Failed to handle paste files:', error);
    throw error;
  }
}
