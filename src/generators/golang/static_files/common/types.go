package common

type ListMethodParams struct {
	Limit  *int `json:"limit,omitempty"`
	Offset *int `json:"offset,omitempty"`
}

func (ms *ListMethodParams) ReplaceNilWithDefault() {
	if ms.Limit == nil {
		defaultInt := 20
		ms.Limit = &defaultInt
	}
	if ms.Offset == nil {
		defaultInt := 0
		ms.Offset = &defaultInt
	}
}
