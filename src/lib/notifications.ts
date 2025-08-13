export function sendNotification(title: string, body: string): void {
  // 检查浏览器是否支持通知
  if (!('Notification' in window)) {
    console.log('此浏览器不支持桌面通知');
    return;
  }
  
  // 检查通知权限
  if (Notification.permission === 'granted') {
    new Notification(title, { body });
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        new Notification(title, { body });
      }
    });
  }
}

export function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    return Promise.resolve(false);
  }
  
  if (Notification.permission === 'granted') {
    return Promise.resolve(true);
  }
  
  if (Notification.permission === 'denied') {
    return Promise.resolve(false);
  }
  
  return Notification.requestPermission().then(permission => permission === 'granted');
}
