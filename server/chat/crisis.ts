// Words that mean someone may be in danger now. A match puts the crisis numbers first; it never replaces the answer.
const CRISIS = [
  /\bsuicid/i,
  /\bkill(ing)? (my ?self|me)\b/i,
  /\b(want|wanna|going) to die\b/i,
  /\bdon[’']?t want to (live|be alive)\b/i,
  /\bend (my|it) (life|all)\b/i,
  /\b(hurt|hurting|cut|cutting|hang|hanging) (my ?self)\b/i,
  /\bself[- ]harm/i,
  /\boverdos|\bo\.?d[’']?d\b|\bnot breathing\b/i,
  /\b(hits|beats|hurts|chokes) me\b|\b(being|getting|was) (beaten|hurt|attacked|raped)\b|\braped?\b/i,
  /\b(domestic|family) violence\b|\babus(e|ed|ing|ive)\b/i,
  /\b(i[’']?m|i am|we[’']?re|we are) in danger\b|\bnot safe (at home|here)\b/i,
  /\bmatarme\b|\bquitarme la vida\b|\bquiero morir(me)?\b|\bno quiero vivir\b|\bhacerme daño\b/i,
  /\bsobredosis\b|\bme (pega|golpea|maltrata)\b|\bviolencia (doméstica|familiar)\b|\bviolaron\b|\bestoy en peligro\b/i,
]

export const isCrisis = (text: string) => CRISIS.some(pattern => pattern.test(text))
