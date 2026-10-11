<script setup>
import { computed, ref, watch } from 'vue'
import { ElRadioGroup, ElRadioButton, ElCheckbox, ElTag } from 'element-plus'
import { Paper, Question as QuestionUtil } from '../../../../utils/paper.js'
import Question from './Question.vue'
import MarkupText from './MarkupText.vue'
const props = defineProps({
  paper: { type: Object, default: () => ({}) },
  showAnswer: { type: Boolean, default: true },
  imageBase: String,
  audioBase: String,
})
const emit = defineEmits(['focus', 'answer'])
const answerVisible = ref(props.showAnswer),
  filter = ref('all'),
  scroll = ref()
watch(
  () => props.showAnswer,
  (value) => {
    answerVisible.value = value
  },
)
const questions = computed(() => Paper.getQuestions(props.paper))
const errors = computed(() => QuestionUtil.filterErrors(questions.value))
watch(errors, (value) => {
  if (!value[filter.value]) filter.value = 'all'
})
const visibleIds = computed(() =>
  filter.value === 'all' ? null : new Set((errors.value[filter.value] ?? []).map((q) => q.id)),
)
function focusGroup(group) {
  const node = [...(scroll.value?.querySelectorAll('[data-group-id]') ?? [])].find(
    (node) => node.dataset.groupId === group.id,
  )
  if (node) scroll.value.scrollTop = node.offsetTop - scroll.value.offsetTop
  emit('focus', group.questions?.[0] ?? group)
}
const chinese = (n) => (n < 11 ? '一二三四五六七八九十'[n - 1] : String(n))
</script>
<template>
  <div class="paper-view">
    <div class="paper-header">
      <ElRadioGroup
        v-model="filter"
        size="small"
      >
        <ElRadioButton value="all">全部{{ questions.length }}题</ElRadioButton>
        <ElRadioButton
          v-for="(items, name) in errors"
          :key="name"
          :value="name"
        >
          <span class="paper-error">{{ name }}{{ items.length }}题</span>
        </ElRadioButton>
      </ElRadioGroup>
      <ElCheckbox v-model="answerVisible">显示答案</ElCheckbox>
      <span>原始总分: {{ paper.totalScore ?? 0 }} 分</span>
    </div>
    <nav
      class="paper-groups"
      aria-label="题组导航"
    >
      <ElTag
        v-for="group in paper.groups"
        :key="group.id"
        tabindex="0"
        role="button"
        @click="focusGroup(group)"
        @keydown.enter="focusGroup(group)"
        @keydown.space.prevent="focusGroup(group)"
      >
        {{ group.title.split(/[（(,.。:：<]/)[0] }} {{ group.questions.length }}
      </ElTag>
    </nav>
    <article
      ref="scroll"
      class="exam-paper"
    >
      <h3 class="paper-title">{{ paper.title }}</h3>
      <MarkupText
        :text="paper.memo"
        :image-base="imageBase"
        :audio-base="audioBase"
      />
      <section
        v-for="(group, index) in paper.groups"
        :key="group.id"
        :data-group-id="group.id"
      >
        <h4>
          {{ chinese(index + 1) }}、
          <MarkupText :text="group.title" />
        </h4>
        <MarkupText
          :text="group.memo"
          :image-base="imageBase"
          :audio-base="audioBase"
        />
        <template
          v-for="question in group.questions"
          :key="question.id"
        >
          <Question
            v-if="!visibleIds || visibleIds.has(question.id)"
            :question="question"
            :show-answer="answerVisible"
            :image-base="imageBase"
            :audio-base="audioBase"
            @focus="emit('focus', $event)"
            @answer="emit('answer', $event)"
          />
        </template>
      </section>
    </article>
  </div>
</template>
<style scoped>
.paper-view {
  min-width: 0;
}
.paper-header {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 16px;
}
.paper-groups {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 8px 0;
}
.paper-groups :deep(.el-tag) {
  cursor: pointer;
}
.exam-paper {
  max-height: 72vh;
  overflow: auto;
  position: relative;
  color: #111;
  line-height: 1.6;
  padding-right: 8px;
}
.paper-title {
  text-align: center;
  font-size: 18px;
  margin: 24px 0;
}
.exam-paper h4 {
  font-size: 15px;
  font-weight: 500;
  margin: 32px 0;
}
.paper-error {
  color: var(--el-color-danger);
}
</style>
