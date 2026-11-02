# Tablero

2026-11-02 America/Buenos_Aires. Un escritor por worktree; sin locks distribuidos.
| ID | Estado | Dueño | Rama / worktree | Intento / evidencia |
|---|---|---|---|---|
| NP-001 | DONE | Codex | codex/np-coordination / D:\Escritorio\nexo-pedidos | 1; 169247d; contratos y worktree listos; baseline 71+18 checks aprobados |
| E0 | DONE | Antigravity | codex/experiment-E0 / D:\Escritorio\nexo-pedidos-worktrees\E0 | 1; Sonnet 5.5 Low observado, no enviado |
| NP-002 | READY | Antigravity | por crear tras E0 | depende de E0 aceptado |
| NP-003 | BLOCKED | Antigravity | por crear tras NP-002 | depende de demo aceptada |

- E0: RUNNING confirmado visualmente, 15:01 local aprox.; conversación Implement E0 Nexo Pedidos Map, mensaje enviado una vez, Sonnet 5.5 Low. Coordinador sólo prepara contratos en su worktree.

- NP-002: asignado en exclusiva a Antigravity; worktree D:\Escritorio\nexo-pedidos-worktrees\NP-002, rama codex/np-002-demo, base producto 2f9bfc0 y contrato fijado bfe06c6. Pendiente envío confirmado; modelo Opus 5.5 Medium.
- NP-002 DISPATCHED: mensaje enviado una vez por UI 15:06 aprox.; Opus 5.5 Medium confirmado, rama codex/np-002-demo visible. No otro escritor en ese worktree.
- NP-002 intento 1 terminó por cuota, parcial ef38cd4 NO aceptado. Recuperación intento 2 en mismo worktree exclusivo y contrato 4e16add; Gemini 4 Argon Medium con cuota observada. Estado DISPATCHED sólo tras envío UI confirmado.
