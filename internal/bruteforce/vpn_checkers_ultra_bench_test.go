package bruteforce

import "testing"

var sinkBytes []byte
var sinkString string

func BenchmarkStringToBytes(b *testing.B) {
	s := "benchmark"
	for i := 0; i < b.N; i++ {
		sinkBytes = stringToBytes(s)
	}
}

func BenchmarkBytesToString(b *testing.B) {
	data := []byte("benchmark")
	for i := 0; i < b.N; i++ {
		sinkString = bytesToString(data)
	}
}
