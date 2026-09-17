// 전화번호 포맷팅 (010-1234-5678)
export function formatPhoneNumber(val) {
  if (!val) return '';
  const clean = val.replace(/[^0-9]/g, '');
  if (clean.length <= 3) {
    return clean;
  }
  if (clean.length <= 7) {
    return `${clean.slice(0, 3)}-${clean.slice(3)}`;
  }
  return `${clean.slice(0, 3)}-${clean.slice(3, 7)}-${clean.slice(7, 11)}`;
}

// 날짜/시간 포맷팅 (한국 시간)
export function formatDateTime(isoString) {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat('ko-KR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(d);
  } catch (e) {
    return isoString;
  }
}

// CSV 다운로드 유틸리티 (UTF-8 BOM 포함하여 한글 깨짐 방지)
export function exportToCSV(filename, headers, rows) {
  const BOM = '\uFEFF';
  const csvContent = [
    headers.join(','),
    ...rows.map(row => 
      row.map(val => {
        const text = (val ?? '').toString().replace(/"/g, '""');
        return `"${text}"`;
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
