# 0001 — UserRole and DinoAudience remain separate

Status: Proposed

`UserRole` controls authentication/authorization for `User`; `DinoAudience` selects an educational answer audience on `DinoAnswer`. Their shared teacher/student/parent labels do not give them the same security semantics.

Decision: keep separate. Adding an auth role must not silently make it a supported content audience, and changing content targeting must not alter access control.
