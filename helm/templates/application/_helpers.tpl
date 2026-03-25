{{/* vim: set filetype=mustache: */}}
{{/*
Application component name
*/}}
{{- define "celadon.application.name" -}}
{{- include "celadon.fullname" . -}}
{{- end -}}

{{/*
Application component labels
*/}}
{{- define "celadon.application.labels" -}}
{{ include "celadon.labels" . }}
app.kubernetes.io/component: application
{{- end -}}

{{/*
Application component selector/match labels
*/}}
{{- define "celadon.application.matchLabels" -}}
{{ include "celadon.matchLabels" . }}
app.kubernetes.io/component: application
{{- end -}}

{{/*
Application pod labels
*/}}
{{- define "celadon.application.podLabels" -}}
{{ include "celadon.application.labels" . }}
{{- with .Values.application.podLabels }}
{{ toYaml . }}
{{- end }}
{{- end -}}
