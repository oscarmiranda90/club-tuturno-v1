# Club TuTurno V1

## Scope

This repository is the isolated Club handoff. Keep the minimal Home entry,
Club screens, celebrations, domain rules, demo adapter, and integration docs.
Do not add unrelated TuTurno flows.

## Language

Every user-facing string must use neutral Venezuelan Spanish. Keep the product
terms `SAN`, `SANes`, `pote`, `cédula`, and `RIF`. Run `npm run check` before
handing off changes.

## Architecture

UI components must consume `ClubSnapshot`; they must not import demo fixtures.
Demo mutations belong under `src/demo`. Production data adapters belong under
`src/data`. Business rules stay as pure functions under `src/domain`.
