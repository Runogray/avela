/** The "Thank you" note at the foot of an event, in the occasion's own voice:
 * a couple for weddings, the celebrant (first person) for birthdays and
 * graduations, the parents for baby showers, the family for a celebration of
 * life. Matches the occasion descriptions' voice. */
const THANKS: Record<string, string> = {
  wedding:
    "We’re overflowing with gratitude. Thank you for your love, your presence, and your generous gift. You help make our celebration everything we dreamed of.",
  birthday:
    "I’m so grateful you’re part of my special day. Thank you for your love, your warm wishes, and your thoughtful gift. You’ve made this birthday one to remember.",
  baby:
    "Our hearts are so full. Thank you for your love, your kind wishes, and your generous gift as we get ready to welcome our little one. We can’t wait for them to meet you.",
  graduation:
    "Thank you for celebrating this milestone with me. Your love, your encouragement, and your thoughtful gift mean so much as I step into what’s next.",
  farewell:
    "Our family is deeply grateful. Thank you for honouring our loved one’s memory, for your kind words, and for standing with us. Your support means more than we can say.",
};

export function thankYouFor(occasion?: string): string {
  return THANKS[occasion ?? ""] ?? THANKS.wedding;
}
