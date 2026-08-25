import { QualificationAnswers, QualificationResult, QualificationStatus } from '../types/lead.js';

/**
 * Evaluates qualification answers based on preliminary disability intake criteria:
 * 1. Age: 18 - 66 years old.
 * 2. Current Benefits: Must not already receive SSDI/SSI benefits.
 * 3. Condition Duration: Expected >= 12 months.
 * 4. Employment: Not working substantial full-time.
 */
export const evaluateQualification = (answers: QualificationAnswers): QualificationResult => {
  const reasons: string[] = [];
  let isDisqualified = false;

  // 1. Check Age
  if (answers.age !== undefined) {
    const ageNum = Number(answers.age);
    if (!isNaN(ageNum)) {
      if (ageNum < 18) {
        isDisqualified = true;
        reasons.push('Applicant must be at least 18 years old.');
      } else if (ageNum > 66) {
        isDisqualified = true;
        reasons.push('Applicant is past standard full retirement age for SSDI.');
      }
    }
  }

  // 2. Check Existing Benefits
  if (answers.receivingBenefits) {
    const recBen = String(answers.receivingBenefits).trim().toLowerCase();
    if (recBen === 'yes' || recBen === 'true' || recBen === 'already_receiving') {
      isDisqualified = true;
      reasons.push('Applicant is already receiving disability benefits.');
    }
  }

  // 3. Check Condition Duration
  if (answers.conditionDuration) {
    const duration = String(answers.conditionDuration).trim().toLowerCase();
    if (duration === 'less_than_12_months' || duration === 'short_term' || duration === 'no') {
      isDisqualified = true;
      reasons.push('Disability condition must be expected to last 12 months or longer.');
    }
  }

  // 4. Check Employment Status
  if (answers.employmentStatus) {
    const emp = String(answers.employmentStatus).trim().toLowerCase();
    if (emp === 'working_full_time' || emp === 'employed_full_time') {
      isDisqualified = true;
      reasons.push('Full-time employment exceeds Substantial Gainful Activity (SGA) limits.');
    }
  }

  const status: QualificationStatus = isDisqualified ? 'not_qualified' : 'qualified';
  const reason = isDisqualified
    ? reasons.join(' ')
    : 'Applicant meets standard preliminary qualification criteria.';

  return {
    status,
    reason,
    details: {
      evaluatedFields: Object.keys(answers),
      passedCriteria: !isDisqualified,
    },
  };
};

// Export object for backwards compatibility / tests
export const QualificationService = {
  evaluate: evaluateQualification,
};
