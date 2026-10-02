export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

/** Sends email. A real provider is chosen before staging; until then LogMailer stands in. */
export interface Mailer {
  send(message: MailMessage): Promise<void>;
}

/**
 * Local and tests: writes each message to the log (so the link can be clicked from the
 * terminal) and keeps it in `sent` for tests to read.
 */
export class LogMailer implements Mailer {
  readonly sent: MailMessage[] = [];

  constructor(private readonly log: (line: string) => void = () => {}) {}

  send(message: MailMessage): Promise<void> {
    this.sent.push(message);
    this.log(`Mail to ${message.to}: ${message.subject}\n${message.text}`);
    return Promise.resolve();
  }
}
