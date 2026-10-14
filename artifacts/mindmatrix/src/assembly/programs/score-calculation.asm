; Add a bonus to the score received on input port 00H.
; Try 2AH (42 decimal) as the score. The output port 01H should contain 34H (52).
        IN   00H
        MOV  B, A
        MVI  A, 0AH
        ADD  B
        OUT  01H
        HLT
