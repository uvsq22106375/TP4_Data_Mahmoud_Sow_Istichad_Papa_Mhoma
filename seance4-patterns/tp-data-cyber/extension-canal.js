// B1 · Étendre sans modifier : ajouter le canal « sms-groupe » à la fabrique de notifications.
// La fabrique factory.js reste inchangée.
import { Notification, registerChannel } from '../creationnels/factory.js';

export class SmsGroupeNotification extends Notification {
  send(msg) {
    return `[SMS-GROUPE] ${msg}`;
  }
}

export function installerCanalGroupe() {
  registerChannel('sms-groupe', SmsGroupeNotification);
}
