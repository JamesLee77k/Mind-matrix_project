; Count three attempts with INR and DCR.
; The output port 01H should contain 03H.
        MVI  B, 03H
        MVI  C, 00H
ATTEMPT:
        INR  C
        DCR  B
        JNZ  ATTEMPT
        MOV  A, C
        OUT  01H
        HLT
