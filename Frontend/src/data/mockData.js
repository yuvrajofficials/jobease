export const mockDatasets = [
  {
    id: 'user1',
    name: 'USER1',
    members: [
      {
        id: 'user1-cobol-hello',
        name: 'HELLO',
        dataset: 'USER1.COBOL',
        type: 'COBOL',
        content: 
`       IDENTIFICATION DIVISION.
       PROGRAM-ID. HELLO.
       ENVIRONMENT DIVISION.
       DATA DIVISION.
       PROCEDURE DIVISION.
       MAIN-PARA.
           DISPLAY "HELLO, WORLD!".
           STOP RUN.`
      },
      {
        id: 'user1-cobol-calc',
        name: 'CALC',
        dataset: 'USER1.COBOL',
        type: 'COBOL',
        content: 
`       IDENTIFICATION DIVISION.
       PROGRAM-ID. CALC.
       ENVIRONMENT DIVISION.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01 NUM1 PIC 9(4)V99 VALUE ZEROS.
       01 NUM2 PIC 9(4)V99 VALUE ZEROS.
       01 RESULT PIC 9(5)V99 VALUE ZEROS.
       PROCEDURE DIVISION.
       MAIN-PARA.
           DISPLAY "Enter first number: ".
           ACCEPT NUM1.
           DISPLAY "Enter second number: ".
           ACCEPT NUM2.
           ADD NUM1, NUM2 GIVING RESULT.
           DISPLAY "Sum is: ", RESULT.
           STOP RUN.`
      },
      {
        id: 'user1-jcl-hello',
        name: 'HELLO',
        dataset: 'USER1.JCL',
        type: 'JCL',
        content: 
`//HELLO    JOB (ACCT),'RUN HELLO PROGRAM',CLASS=A,
//          MSGCLASS=X,NOTIFY=&SYSUID
//*
//* THIS JCL RUNS THE HELLO PROGRAM
//*
//STEP1    EXEC PGM=HELLO
//STEPLIB  DD   DSN=USER1.LOADLIB,DISP=SHR
//SYSOUT   DD   SYSOUT=*
//SYSPRINT DD   SYSOUT=*
//SYSIN    DD   DUMMY
//`
      }
    ]
  },
  {
    id: 'sys1',
    name: 'SYS1',
    members: [
      {
        id: 'sys1-rexx-sample',
        name: 'SAMPLE',
        dataset: 'SYS1.REXX',
        type: 'REXX',
        content: 
`/* REXX */
SAY 'HELLO FROM REXX PROGRAM'
DO I = 1 TO 5
   SAY 'LOOP ITERATION' I
END
EXIT`
      },
      {
        id: 'sys1-jcl-proc',
        name: 'PROC',
        dataset: 'SYS1.JCL',
        type: 'JCL',
        content: 
`//PROCLIB  PROC
//*
//* STANDARD PROCEDURE FOR COMPILING AND RUNNING COBOL PROGRAMS
//*
//COMP     EXEC PGM=IGYCRCTL,REGION=0M
//SYSIN    DD   DSN=&SYSUID..COBOL(&PROGRAM),DISP=SHR
//SYSLIB   DD   DSN=SYS1.COPYLIB,DISP=SHR
//SYSLIN   DD   DSN=&&LOADSET,DISP=(MOD,PASS),
//         UNIT=SYSDA,SPACE=(TRK,(3,3))
//SYSPRINT DD   SYSOUT=*
//SYSUT1   DD   SPACE=(CYL,(1,1)),UNIT=SYSDA
//SYSUT2   DD   SPACE=(CYL,(1,1)),UNIT=SYSDA
//SYSUT3   DD   SPACE=(CYL,(1,1)),UNIT=SYSDA
//`
      }
    ]
  },
  {
    id: 'training',
    name: 'TRAINING',
    members: [
      {
        id: 'training-cobol-ex01',
        name: 'EX01',
        dataset: 'TRAINING.COBOL',
        type: 'COBOL',
        content: 
`       IDENTIFICATION DIVISION.
       PROGRAM-ID. EX01.
       ENVIRONMENT DIVISION.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01 GREETING PIC X(20) VALUE 'HELLO, STUDENT!'.
       PROCEDURE DIVISION.
       MAIN-PARA.
           DISPLAY GREETING.
           STOP RUN.`
      },
      {
        id: 'training-jcl-ex01',
        name: 'EX01',
        dataset: 'TRAINING.JCL',
        type: 'JCL',
        content: 
`//TRAIN01  JOB (ACCT),'TRAINING EXAMPLE',CLASS=A,
//          MSGCLASS=X,NOTIFY=&SYSUID
//*
//* THIS JCL IS USED FOR TRAINING PURPOSES
//*
//STEP1    EXEC PGM=EX01
//STEPLIB  DD   DSN=TRAINING.LOADLIB,DISP=SHR
//SYSOUT   DD   SYSOUT=*
//SYSPRINT DD   SYSOUT=*
//SYSIN    DD   DUMMY
//`
      },
      {
        id: 'training-data-sample',
        name: 'SAMPLE',
        dataset: 'TRAINING.DATA',
        type: 'DATA',
        content: 
`0001JOHN      DOE       19870315DEVELOPER    05000000
0002JANE      SMITH     19900528ANALYST      04800000
0003ROBERT    JOHNSON   19850712MANAGER      07500000
0004LISA      BROWN     19920403TESTER       04200000
0005MICHAEL   DAVIS     19881127DEVELOPER    05100000`
      }
    ]
  }
];

export const mockJobOutput = {
  jobId: 'JOB12345',
  jobName: 'HELLO',
  submittedAt: new Date().toISOString(),
  status: 'COMPLETED',
  outputs: {
    JOBLOG: 
`10.22.45 JOB12345 $HASP373 HELLO STARTED - INIT 1 - CLASS A - SYS S390
10.22.46 JOB12345 IEF403I HELLO - STARTED - TIME=10.22.46
10.22.47 JOB12345 -                                         --TIMINGS (MINS.)--
10.22.47 JOB12345 -STEPNAME PROCSTEP    RC   EXCP   CONN    TCB    SRB  CLOCK
10.22.47 JOB12345 -STEP1                00     27     11    .00    .00    .01
10.22.47 JOB12345 IEF404I HELLO - ENDED - TIME=10.22.47
10.22.47 JOB12345 -HELLO ENDED. NAME-RUN HELLO PROGRAM TOTAL TCB CPU TIME=
10.22.47 JOB12345 $HASP395 HELLO ENDED`,
    SYSOUT: 
`HELLO, WORLD!`,
    SYSPRINT: 
`1HELLO    JOB (ACCT),'RUN HELLO PROGRAM'
0HELLO    JOB (ACCT),'RUN HELLO PROGRAM'
 START STEP1     PGM=HELLO
0                RC=000`
  }
};

export const currentUser = {
  username: 'STUDENT01',
  fullName: 'Student User',
  avatarUrl: undefined
};