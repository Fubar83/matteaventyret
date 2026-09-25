# Curriculum review checklist (level 1.1, Positionssystemet & uppställning)

This is a sign-off checklist for a Swedish åk 3-6 teacher to confirm before public release, per the build brief's "Correctness testing" table ("A Swedish teacher (åk 3-6) checks method, wording and hints - sign-off before release"). No teacher review has happened yet; this document exists so that review has a concrete, scoped checklist to work from rather than starting from nothing.

## How to review

Run `npm run dev`, open the app, and play through each stage below on a phone-sized window. For each row, confirm the method/notation matches what is taught locally, or note the variation.

## Method conventions

- [ ] Addition: minnessiffra written small, above the next column left, before that column is added (stage 4).
- [ ] Subtraction: struck digit, new value above it, "10" written above the receiving ental (stage 5).
- [ ] Växling across zeros: each zero receives 10, struck, becomes 9 (stage 7, e.g. 1 003 − 457).
- [ ] Decimal comma / thin-space thousands formatting looks right wherever a 4-digit number appears (e.g. "4 506").
- [ ] `carryOrder` default (result digit before minnessiffra) matches what your students see in class; note if your textbook does it the other way (see Settings table in the build brief for the alternative).

## Per-stage wording (Swedish)

- [ ] Stage 1 (Positionssystemet): "ental / tiotal / hundratal / tusental" wording is correct and age-appropriate.
- [ ] Stage 4 hint ("Det är mer än 9. Skriv entalen...") makes sense read aloud to an 8-year-old.
- [ ] Stage 5 hint ("Det går inte att ta bort så mycket. Växla...") makes sense read aloud.
- [ ] Stage 7 zero-crossing Teori text ("Om grannen är en nolla...") is clear without a teacher present.
- [ ] Exempel step prompts (e.g. "Hur mycket är 7 + 8?") match how you'd phrase it in class.

## Known misconception hints

- [ ] "Glömde du minnessiffran?" fires at the right moment (try: answer a tens-column result as if no carry happened).
- [ ] "Kolla vilken siffra som är störst..." fires for the subtract-smaller-from-larger misconception (try: on a borrow column, answer with |top − bottom| instead of the borrowed result).

## Known open variations (see build brief "Settings for known classroom variations")

Not yet exposed as in-app settings; flag if your school uses a different convention:

- [ ] Borrowed ten shown as "10" above the ental vs. a small "1" before the digit.
- [ ] Växling across zeros: each zero struck individually (current behavior) vs. striking the whole group at once.
- [ ] Minnessiffra/result order: result first (current default) vs. minnessiffra first.

## Sign-off

- [ ] Reviewer name, grade(s) taught, and date:
- [ ] Approved for release / approved with the changes noted above / not approved (reason):
