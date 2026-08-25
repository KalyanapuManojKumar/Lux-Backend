import { describe, it, expect } from 'vitest';
import { evaluateQualification } from '../../src/services/qualification.service.js';

describe('QualificationService', () => {
  it('should qualify a standard applicant meeting all criteria', () => {
    const answers = {
      age: 42,
      employmentStatus: 'unemployed',
      receivingBenefits: 'no',
      conditionDuration: '12_months_or_longer',
    };

    const result = evaluateQualification(answers);
    expect(result.status).toBe('qualified');
    expect(result.reason).toContain('Applicant meets standard preliminary qualification criteria');
  });

  it('should disqualify if already receiving disability benefits', () => {
    const answers = {
      age: 45,
      employmentStatus: 'unemployed',
      receivingBenefits: 'yes',
    };

    const result = evaluateQualification(answers);
    expect(result.status).toBe('not_qualified');
    expect(result.reason).toContain('already receiving disability benefits');
  });

  it('should disqualify if applicant is under 18', () => {
    const answers = {
      age: 16,
      employmentStatus: 'unemployed',
      receivingBenefits: 'no',
    };

    const result = evaluateQualification(answers);
    expect(result.status).toBe('not_qualified');
    expect(result.reason).toContain('at least 18 years old');
  });

  it('should disqualify if applicant is past full retirement age', () => {
    const answers = {
      age: 70,
      employmentStatus: 'retired',
      receivingBenefits: 'no',
    };

    const result = evaluateQualification(answers);
    expect(result.status).toBe('not_qualified');
    expect(result.reason).toContain('full retirement age');
  });

  it('should disqualify if condition duration is less than 12 months', () => {
    const answers = {
      age: 50,
      employmentStatus: 'unemployed',
      receivingBenefits: 'no',
      conditionDuration: 'less_than_12_months',
    };

    const result = evaluateQualification(answers);
    expect(result.status).toBe('not_qualified');
    expect(result.reason).toContain('12 months or longer');
  });

  it('should disqualify if working full-time', () => {
    const answers = {
      age: 38,
      employmentStatus: 'working_full_time',
      receivingBenefits: 'no',
    };

    const result = evaluateQualification(answers);
    expect(result.status).toBe('not_qualified');
    expect(result.reason).toContain('Full-time employment');
  });
});
