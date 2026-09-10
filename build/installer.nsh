; Custom finish page to hide the installer window immediately upon clicking Finish.
; This prevents Windows from showing "(Not Responding)" while the application process spawns.

!macro customFinishPage
  Function StartApp
    ; Immediately hide the installer window so it doesn't freeze or show "(Not Responding)"
    ShowWindow $HWNDPARENT 0

    ${if} ${isUpdated}
      StrCpy $1 "--updated"
    ${else}
      StrCpy $1 ""
    ${endif}
    ${StdUtils.ExecShellAsUser} $0 "$launchLink" "open" "$1"
  FunctionEnd

  !define MUI_FINISHPAGE_RUN
  !define MUI_FINISHPAGE_RUN_FUNCTION "StartApp"
  !insertmacro MUI_PAGE_FINISH
!macroend
