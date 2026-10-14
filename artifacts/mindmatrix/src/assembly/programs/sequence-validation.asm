; Compare the first two sequence values from input ports 00H and 01H.
; Output 01H means they match; output 00H means they differ.
        IN   00H
        MOV  B, A
        IN   01H
        CMP  B
        JNZ  INVALID
        MVI  A, 01H
        JMP  DONE
INVALID:
        MVI  A, 00H
DONE:
        OUT  02H
        HLT
