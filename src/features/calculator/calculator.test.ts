import { describe, expect, it } from 'vitest';
import {
  calculatorDisplay,
  calculatorError,
  calculatorExpression,
  initialCalculatorState,
  reduceCalculator,
  type CalculatorAction,
  type Operator,
} from './calculator';

function digits(value: string): CalculatorAction[] {
  return [...value].map((char) =>
    char === '.'
      ? { type: 'decimal' }
      : { type: 'digit', digit: char },
  );
}

function operator(value: Operator): CalculatorAction {
  return { type: 'operator', operator: value };
}

function apply(...actions: CalculatorAction[]) {
  return actions.reduce(reduceCalculator, initialCalculatorState);
}

const equals: CalculatorAction = { type: 'equals' };
const clear: CalculatorAction = { type: 'clear' };
const backspace: CalculatorAction = { type: 'backspace' };
const sign: CalculatorAction = { type: 'sign' };
const percent: CalculatorAction = { type: 'percent' };

describe('calculator', () => {
  it('starts at zero with no expression', () => {
    expect(calculatorDisplay(initialCalculatorState)).toBe('0');
    expect(calculatorExpression(initialCalculatorState)).toBe('');
    expect(calculatorError(initialCalculatorState)).toBeNull();
  });

  it('adds two numbers', () => {
    const state = apply(...digits('12'), operator('+'), ...digits('8'), equals);

    expect(calculatorDisplay(state)).toBe('20');
    expect(calculatorExpression(state)).toBe('');
  });

  it('keeps the expression visible while typing the next operand', () => {
    const state = apply(...digits('12'), operator('+'));

    expect(calculatorDisplay(state)).toBe('12');
    expect(calculatorExpression(state)).toBe('12 +');
  });

  it('chains operations from left to right', () => {
    const state = apply(
      ...digits('2'),
      operator('+'),
      ...digits('3'),
      operator('×'),
      ...digits('4'),
      equals,
    );

    expect(calculatorDisplay(state)).toBe('20');
  });

  it('replaces the pending operator without computing', () => {
    const state = apply(...digits('5'), operator('+'), operator('×'), ...digits('2'), equals);

    expect(calculatorDisplay(state)).toBe('10');
  });

  it('repeats the last operation when pressing equals again', () => {
    const state = apply(...digits('2'), operator('+'), ...digits('3'), equals, equals);

    expect(calculatorDisplay(state)).toBe('8');
  });

  it('computes a percentage relative to the stored value', () => {
    const state = apply(...digits('200'), operator('+'), ...digits('10'), percent, equals);

    expect(calculatorDisplay(state)).toBe('220');
  });

  it('divides by one hundred without a pending operation', () => {
    const state = apply(...digits('50'), percent);

    expect(calculatorDisplay(state)).toBe('0.5');
  });

  it('toggles the sign of the current entry', () => {
    const negative = apply(...digits('5'), sign);
    const positive = reduceCalculator(negative, sign);

    expect(calculatorDisplay(negative)).toBe('-5');
    expect(calculatorDisplay(positive)).toBe('5');
  });

  it('removes the last typed digit', () => {
    const once = apply(...digits('123'), backspace);
    const twice = reduceCalculator(once, backspace);
    const thrice = reduceCalculator(twice, backspace);

    expect(calculatorDisplay(once)).toBe('12');
    expect(calculatorDisplay(twice)).toBe('1');
    expect(calculatorDisplay(thrice)).toBe('0');
  });

  it('shows an error when dividing by zero and recovers on clear', () => {
    const state = apply(...digits('8'), operator('÷'), ...digits('0'), equals);

    expect(calculatorDisplay(state)).toBe('Error');
    expect(calculatorError(state)).toBe('No se puede dividir por cero.');

    const cleared = reduceCalculator(state, clear);

    expect(calculatorDisplay(cleared)).toBe('0');
    expect(calculatorError(cleared)).toBeNull();
  });

  it('starts fresh when typing after an error', () => {
    const state = apply(...digits('8'), operator('÷'), ...digits('0'), equals);
    const recovered = apply(...digits('5'));

    expect(calculatorDisplay(state)).toBe('Error');
    expect(calculatorDisplay(recovered)).toBe('5');
    expect(calculatorError(recovered)).toBeNull();
  });

  it('avoids floating point noise', () => {
    const state = apply(...digits('0.1'), operator('+'), ...digits('0.2'), equals);

    expect(calculatorDisplay(state)).toBe('0.3');
  });

  it('avoids leading zeros and keeps a single decimal point', () => {
    const state = apply(...digits('007'), { type: 'decimal' }, { type: 'decimal' }, ...digits('5'));

    expect(calculatorDisplay(state)).toBe('7.5');
  });

  it('starts a decimal entry as 0.', () => {
    const state = apply({ type: 'decimal' });

    expect(calculatorDisplay(state)).toBe('0.');
  });
});
