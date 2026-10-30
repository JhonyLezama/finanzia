export type Operator = '+' | '-' | '×' | '÷';

export interface CalculatorState {
  current: string;
  stored: number | null;
  operator: Operator | null;
  justEvaluated: boolean;
  lastOperator: Operator | null;
  lastOperand: number | null;
  error: string | null;
}

export type CalculatorAction =
  | { type: 'digit'; digit: string }
  | { type: 'decimal' }
  | { type: 'operator'; operator: Operator }
  | { type: 'equals' }
  | { type: 'clear' }
  | { type: 'backspace' }
  | { type: 'sign' }
  | { type: 'percent' };

export const initialCalculatorState: CalculatorState = {
  current: '',
  stored: null,
  operator: null,
  justEvaluated: false,
  lastOperator: null,
  lastOperand: null,
  error: null,
};

const DIVIDE_BY_ZERO = 'No se puede dividir por cero.';
const MAX_DIGITS = 12;

function errorState(message: string): CalculatorState {
  return { ...initialCalculatorState, error: message };
}

export function formatCalculatorNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return '0';
  }
  const rounded = Number(value.toPrecision(12));
  if (Object.is(rounded, -0)) {
    return '0';
  }
  return String(rounded);
}

function evaluate(
  left: number,
  operator: Operator,
  right: number,
): number | string {
  switch (operator) {
    case '+':
      return left + right;
    case '-':
      return left - right;
    case '×':
      return left * right;
    case '÷':
      return right === 0 ? DIVIDE_BY_ZERO : left / right;
  }
}

function inputDigit(state: CalculatorState, digit: string): CalculatorState {
  if (!/^\d$/.test(digit)) {
    return state;
  }
  if (state.error || state.justEvaluated) {
    return { ...initialCalculatorState, current: digit };
  }

  const digits = state.current.replace('-', '').replace('.', '');
  if (digits.length >= MAX_DIGITS) {
    return state;
  }
  if (state.current === '0') {
    return { ...state, current: digit };
  }
  if (state.current === '-0') {
    return { ...state, current: digit === '0' ? '-0' : `-${digit}` };
  }

  return { ...state, current: `${state.current}${digit}` };
}

function inputDecimal(state: CalculatorState): CalculatorState {
  if (state.error || state.justEvaluated) {
    return { ...initialCalculatorState, current: '0.' };
  }
  if (state.current === '') {
    return { ...state, current: '0.' };
  }
  if (state.current.includes('.')) {
    return state;
  }

  return { ...state, current: `${state.current}.` };
}

function chooseOperator(
  state: CalculatorState,
  operator: Operator,
): CalculatorState {
  if (state.error) {
    return initialCalculatorState;
  }

  const entering = state.current !== '';
  let stored = state.stored;

  if (entering) {
    const operand = Number(state.current);
    if (stored !== null && state.operator !== null) {
      const result = evaluate(stored, state.operator, operand);
      if (typeof result === 'string') {
        return errorState(result);
      }
      stored = result;
    } else {
      stored = operand;
    }
  } else if (stored === null) {
    stored = 0;
  }

  return {
    ...state,
    current: '',
    stored,
    operator,
    justEvaluated: false,
    lastOperator: null,
    lastOperand: null,
    error: null,
  };
}

function pressEquals(state: CalculatorState): CalculatorState {
  if (state.error) {
    return initialCalculatorState;
  }

  if (state.operator !== null && state.stored !== null) {
    const operand =
      state.current === '' ? state.stored : Number(state.current);
    const result = evaluate(state.stored, state.operator, operand);
    if (typeof result === 'string') {
      return errorState(result);
    }

    return {
      ...state,
      current: '',
      stored: result,
      operator: null,
      justEvaluated: true,
      lastOperator: state.operator,
      lastOperand: operand,
      error: null,
    };
  }

  if (
    state.justEvaluated &&
    state.lastOperator !== null &&
    state.lastOperand !== null
  ) {
    const result = evaluate(state.stored ?? 0, state.lastOperator, state.lastOperand);
    if (typeof result === 'string') {
      return errorState(result);
    }
    return { ...state, current: '', stored: result, justEvaluated: true };
  }

  return state;
}

function backspace(state: CalculatorState): CalculatorState {
  if (state.error || state.justEvaluated || state.current === '') {
    return initialCalculatorState;
  }

  const next = state.current.slice(0, -1);
  return { ...state, current: next === '-' ? '' : next };
}

function toggleSign(state: CalculatorState): CalculatorState {
  if (state.error) {
    return initialCalculatorState;
  }
  if (state.current !== '') {
    if (state.current === '0') {
      return state;
    }
    return {
      ...state,
      current: state.current.startsWith('-')
        ? state.current.slice(1)
        : `-${state.current}`,
    };
  }
  if (state.stored !== null) {
    return { ...state, stored: -state.stored };
  }
  return state;
}

function pressPercent(state: CalculatorState): CalculatorState {
  if (state.error) {
    return initialCalculatorState;
  }
  if (state.current !== '') {
    const value = Number(state.current);
    if (state.operator !== null && state.stored !== null) {
      return {
        ...state,
        current: formatCalculatorNumber((state.stored * value) / 100),
      };
    }
    return { ...state, current: formatCalculatorNumber(value / 100) };
  }
  if (state.stored !== null) {
    return { ...state, stored: state.stored / 100 };
  }
  return state;
}

export function reduceCalculator(
  state: CalculatorState,
  action: CalculatorAction,
): CalculatorState {
  switch (action.type) {
    case 'digit':
      return inputDigit(state, action.digit);
    case 'decimal':
      return inputDecimal(state);
    case 'operator':
      return chooseOperator(state, action.operator);
    case 'equals':
      return pressEquals(state);
    case 'clear':
      return initialCalculatorState;
    case 'backspace':
      return backspace(state);
    case 'sign':
      return toggleSign(state);
    case 'percent':
      return pressPercent(state);
  }
}

export function calculatorDisplay(state: CalculatorState): string {
  if (state.error) {
    return 'Error';
  }
  if (state.current !== '') {
    return state.current;
  }
  if (state.stored !== null) {
    return formatCalculatorNumber(state.stored);
  }
  return '0';
}

export function calculatorExpression(state: CalculatorState): string {
  if (state.error || state.operator === null || state.stored === null) {
    return '';
  }
  return `${formatCalculatorNumber(state.stored)} ${state.operator}`;
}

export function calculatorError(state: CalculatorState): string | null {
  return state.error;
}
