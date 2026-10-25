// Words that mean someone may be in danger now. A match puts the crisis numbers first; it never replaces the answer.
const CRISIS = [
  /\bsuicid/i,
  /\bkill(ing)? (my ?self|me)\b/i,
  /\bend (my|it) (life|all)\b/i,
  /\bhurt(ing)? (my ?self)\b/i,
  /\bself[- ]harm/i,
  /\boverdos/i,
  /\bnot breathing\b/i,
  /\b(being|getting) (beaten|hurt|attacked)\b/i,
  /\bin danger\b/i,
  /\bsuicid|\bmatarme\b|\bquitarme la vida\b|\bhacerme daño\b|\bsobredosis\b|\ben peligro\b/i,
]

export const isCrisis = (text: string) => CRISIS.some(pattern => pattern.test(text))
