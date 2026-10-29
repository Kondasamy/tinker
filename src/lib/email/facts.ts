// Facts about SMTP, SPF, DKIM, DMARC and the 2024 bulk-sender rules for How email arrives (R5), each checked against
// its source. Copy quotes them from here, never by hand.
import data from '../../../data/email/facts.json' with { type: 'json' };
import { factsOf } from '../tools/facts';

export const { ACCESSED, FACTS, fact } = factsOf(data);
