// Простой EventBus для локальной публикации/подписки внутри renderer.
// Позволяет отделить UI-элементы (модалки, кнопки) от действий/бизнес-логики.
type Handler = (...args: any[]) => void;

export class EventBus {
  private handlers = new Map<string, Handler[]>();

  // Подписаться на событие
  on(event: string, h: Handler) {
    const list = this.handlers.get(event) || [];
    list.push(h);
    this.handlers.set(event, list);
    return () => this.off(event, h);
  }

  // Отписаться
  off(event: string, h: Handler) {
    const list = this.handlers.get(event);
    if (!list) return;
    const idx = list.indexOf(h);
    if (idx >= 0) list.splice(idx, 1);
    if (list.length === 0) this.handlers.delete(event);
  }

  // Вызвать событие
  emit(event: string, ...args: any[]) {
    const list = this.handlers.get(event);
    if (!list) return;
    // копируем массив чтобы обработчики могли мутировать подписки
    for (const h of [...list]) {
      try {
        h(...args);
      } catch (e) {
        // логируем, но не прерываем цикл
        // eslint-disable-next-line no-console
        console.error(`[EventBus] handler for "${event}" failed`, e);
      }
    }
  }
}

export const eventBus = new EventBus();