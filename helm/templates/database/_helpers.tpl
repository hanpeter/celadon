{{/* vim: set filetype=mustache: */}}
{{/*
Database component name
*/}}
{{- define "celadon.database.name" -}}
{{- printf "%s-database" (include "celadon.fullname" .) -}}
{{- end -}}

{{/*
Database component labels
*/}}
{{- define "celadon.database.labels" -}}
{{ include "celadon.labels" . }}
app.kubernetes.io/component: database
{{- end -}}

{{/*
Database component selector/match labels
*/}}
{{- define "celadon.database.matchLabels" -}}
{{ include "celadon.matchLabels" . }}
app.kubernetes.io/component: database
{{- end -}}

{{/*
Database pod labels
*/}}
{{- define "celadon.database.podLabels" -}}
{{ include "celadon.database.labels" . }}
{{- with .Values.database.podLabels }}
{{ toYaml . }}
{{- end }}
{{- end -}}
