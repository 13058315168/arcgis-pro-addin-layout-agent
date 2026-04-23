Option Explicit

Dim shell, fso, rootDir, scriptPath, command
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

rootDir = fso.GetParentFolderName(WScript.ScriptFullName)
scriptPath = rootDir & "\tools\start-ribbon-designer-hidden.ps1"

command = "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File " & Chr(34) & scriptPath & Chr(34)
shell.Run command, 0, False
