; Accept scores greater than or equal to 46H (70 decimal).
; Output 01H means passed; output 00H means below threshold.
        IN   00H
        MVI  B, 46H
        CMP  B
        JC   BELOW
        JZ   PASS
PASS:
        MVI  A, 01H
        JMP  FINISH
BELOW:
        MVI  A, 00H
FINISH:
        OUT  02H
        HLT
