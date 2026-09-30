# Per-shop accent

Each shop picks one brand color. It recolors the accent and nothing else, so a shop can look like itself without breaking contrast or meaning.

## What changes

- Changes: `accent`, `accent-hover`, `accent-pressed`, `on-accent`, `accent-soft`, `accent-strong`.
- Never changes: `brand`, every status color, the surfaces, `ink` and `ink-muted`, and receipts (they print in one ink).
- Default accent is Crema (`#E2A13B`).

## How to derive it

Call `BrewPoint.deriveAccent(hex, theme)` and apply the result with `BrewPoint.applyAccent(element, hex, theme)`, setting the six variables on the root. Do this once per theme change and on load. The function:
1. Picks `on-accent` (dark ink or white), whichever reads better, and moves the accent's lightness until that pair reaches 4.5:1.
2. In Night shift, lifts an accent that is nearly invisible on the dark ground until it reaches 3:1 against it.
3. Builds `accent-hover` and `accent-pressed` one and two steps away from the accent (darker in Daylight, lighter in Night shift), backing off if the text pair would drop under 4.5:1.
4. Builds `accent-soft` as a light or dark tint of the same hue.
5. Builds `accent-strong` by moving lightness until it reaches 4.5:1 on both `surface-raised` and `accent-soft`.

The stored value is a single hex string in the tenant settings. Store what the owner typed; derive on the client.

## Rules

- Validate the hex (`#RRGGBB`) before deriving. Show "Enter a color like #1F8A8A" for anything else.
- Show the AccentPicker's contrast readout so the owner sees when their color was adjusted. The color that ships is the derived accent, which may differ slightly from what they typed.
- Do not let a shop color a status. A shop with a red accent still shows danger in `danger`, with an icon and a word.
- Check the sign-up and plan-choice screens with the default accent, since no shop color exists yet.
