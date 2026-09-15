# Complete Arabic and English support

## Goal
Make every user-facing page readable in either Arabic or English, with the selected language preserved and the whole interface switching consistently.

## What will change
- Expand the central translation dictionary to cover all visible labels, buttons, headings, descriptions, placeholders, validation messages, alerts, empty states, and notifications.
- Replace Arabic-only and English-only text across public pages, account pages, booking, consultations, chat, course content, specialist views, dashboards, and administration screens with translated text.
- Keep database/user content as entered, while translating the surrounding interface and known status/role labels.
- Correct RTL/LTR behavior for alignment, icon direction, menus, dialogs, forms, tables, and fixed controls.
- Make page titles and descriptions follow the selected language where applicable.
- Preserve the language choice between visits and ensure it is applied before the page appears.

## Verification
- Check both Arabic and English on representative public, account, consultation, and administration pages.
- Scan the application again for remaining hardcoded user-facing Arabic text.
- Run the existing checks and verify mobile and desktop layouts without overlaps or clipped text.

## Technical details
- Continue using the existing `LanguageContext` and typed `t()` translation keys.
- Organize new keys by feature to keep the dictionary maintainable.
- Use direction-aware utilities instead of hardcoded left/right positioning where the layout must mirror.
- Avoid changing business rules, permissions, or stored data.
