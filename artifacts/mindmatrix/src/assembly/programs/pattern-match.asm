; Check whether the supplied pattern key matches 2AH.
; Enter 2AH on port 00H for a match; output appears on port 02H.
        IN   00H
        MVI  B, 2AH
        CMP  B
        JNZ  NO_MATCH
        MVI  A, 01H
        JMP  FINISH
NO_MATCH:
        MVI  A, 00H
FINISH:
        OUT  02H
        HLT
