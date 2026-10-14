; Count down from five. The final value is zero.
        MVI  B, 05H
TICK:
        DCR  B
        JNZ  TICK
        MOV  A, B
        OUT  01H
        HLT
