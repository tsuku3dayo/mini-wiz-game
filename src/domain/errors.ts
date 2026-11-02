// ルールが投げるエラー（仕様書 §22.3、§24.1）。ゲーム API が GameError に変える

export interface FieldError {
  field: string;
  message: string;
}

export class DomainError extends Error {
  readonly code: string;
  readonly status: 400 | 404 | 409;

  constructor(code: string, status: 400 | 404 | 409, message: string) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.status = status;
  }
}

export class ValidationError extends DomainError {
  readonly details: FieldError[];

  constructor(details: FieldError[], message = '入力が正しくありません') {
    super('validation_error', 400, message);
    this.details = details;
  }
}

export class InvalidStateError extends DomainError {
  constructor(message = 'その操作は いまは できない') {
    super('invalid_state', 409, message);
  }
}

export class ConflictError extends DomainError {
  constructor(message = '他の操作と競合しました') {
    super('conflict', 409, message);
  }
}

export class RuleViolationError extends DomainError {
  constructor(message: string) {
    super('rule_violation', 409, message);
  }
}

export class GameNotFoundError extends DomainError {
  constructor(message = 'プレイ中のゲームが ありません') {
    super('game_not_found', 404, message);
  }
}

export class SaveNotFoundError extends DomainError {
  constructor(message = 'セーブデータが ありません') {
    super('save_not_found', 404, message);
  }
}
