{{/* vim: set filetype=mustache: */}}
{{/*
Expand the name of the chart.
*/}}
{{- define "celadon.name" -}}
{{- .Values.nameOverride | default .Chart.Name | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "celadon.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- $name := .Values.nameOverride | default .Chart.Name -}}
{{- if contains $name .Release.Name -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}
{{- end -}}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "celadon.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Common labels
*/}}
{{- define "celadon.labels" -}}
app.kubernetes.io/name: {{ include "celadon.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
helm.sh/chart: {{ include "celadon.chart" . }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- with .Values.commonLabels }}
{{ toYaml . }}
{{- end }}
{{- end -}}

{{/*
Common annotations
*/}}
{{- define "celadon.annotations" -}}
{{- if .Values.commonAnnotations -}}
{{- toYaml .Values.commonAnnotations }}
{{- else -}}
{}
{{- end -}}
{{- end -}}

{{/*
Image reference
*/}}
{{- define "celadon.image" -}}
{{- $image := .image | default dict -}}
{{- $ctx := .ctx | default dict -}}
{{- $v := ($ctx.Values) | default dict -}}
{{- $registry := $image.registry | default ($v.global).imageRegistry -}}
{{- $repository := $image.repository | default "" -}}
{{- $tag := $image.tag | default ($ctx.Chart).AppVersion | default "" -}}
{{- if $registry -}}
{{- printf "%s/%s:%s" $registry $repository $tag -}}
{{- else -}}
{{- printf "%s:%s" $repository $tag -}}
{{- end -}}
{{- end -}}

{{/*
Image pull secrets
*/}}
{{- define "celadon.imagePullSecrets" -}}
{{- $pullSecrets := .pullSecrets | default list -}}
{{- $ctx := .ctx | default dict -}}
{{- $v := ($ctx.Values) | default dict -}}
{{- $globalPullSecrets := ($v.global).imagePullSecrets | default list -}}
{{- $merged := concat $pullSecrets $globalPullSecrets | uniq -}}
{{- toYaml $merged -}}
{{- end -}}

{{/*
Common selector/match labels
*/}}
{{- define "celadon.matchLabels" -}}
app.kubernetes.io/name: {{ include "celadon.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}
