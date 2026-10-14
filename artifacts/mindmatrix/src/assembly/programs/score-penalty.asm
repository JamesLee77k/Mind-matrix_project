; Start from 100 points and subtract the penalty entered on port 00H.
; With a penalty of 10, output port 01H should contain 5AH (90).
        IN   00H
        MOV  B, A
        MVI  A, 64H
        SUB  B
        OUT  01H
        HLT
